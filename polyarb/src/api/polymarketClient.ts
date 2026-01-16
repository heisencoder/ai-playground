/**
 * Polymarket API Client
 * Provides access to both CLOB (order book) and Gamma (market metadata) APIs
 */

import type {
  OrderBookSummary,
  GammaMarket,
  GammaEvent,
  MidpointResponse,
  SpreadResponse,
} from '../types/index.js'

const DEFAULT_CLOB_BASE_URL = 'https://clob.polymarket.com'
const DEFAULT_GAMMA_BASE_URL = 'https://gamma-api.polymarket.com'
const HTTP_NOT_FOUND = 404

/**
 * Configuration options for the Polymarket client
 */
export interface PolymarketClientConfig {
  /** Base URL for CLOB API */
  clobBaseUrl?: string
  /** Base URL for Gamma API */
  gammaBaseUrl?: string
  /** Request timeout in milliseconds */
  timeout?: number
}

/**
 * Query parameters for fetching markets
 */
export interface GetMarketsParams {
  /** Filter by active status */
  active?: boolean
  /** Filter by closed status */
  closed?: boolean
  /** Maximum number of results */
  limit?: number
  /** Offset for pagination */
  offset?: number
}

/**
 * Client for interacting with Polymarket APIs
 */
export class PolymarketClient {
  private readonly clobBaseUrl: string
  private readonly gammaBaseUrl: string

  constructor(config: PolymarketClientConfig = {}) {
    this.clobBaseUrl = config.clobBaseUrl ?? DEFAULT_CLOB_BASE_URL
    this.gammaBaseUrl = config.gammaBaseUrl ?? DEFAULT_GAMMA_BASE_URL
  }

  /**
   * Get the CLOB API base URL
   */
  getClobBaseUrl(): string {
    return this.clobBaseUrl
  }

  /**
   * Get the Gamma API base URL
   */
  getGammaBaseUrl(): string {
    return this.gammaBaseUrl
  }

  /**
   * Make a CLOB API request
   */
  private async clobRequest<T>(
    endpoint: string,
    params?: Record<string, string>
  ): Promise<T> {
    const url = new URL(endpoint, this.clobBaseUrl)
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.set(key, value)
      })
    }

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(
        `Failed to fetch order book: ${response.status} ${response.statusText}`
      )
    }

    return response.json() as Promise<T>
  }

  /**
   * Make a Gamma API request
   */
  private async gammaRequest<T>(
    endpoint: string,
    params?: Record<string, string | number | boolean>
  ): Promise<T> {
    const url = new URL(endpoint, this.gammaBaseUrl)
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.set(key, String(value))
      })
    }

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(
        `Failed to fetch from Gamma API: ${response.status} ${response.statusText}`
      )
    }

    return response.json() as Promise<T>
  }

  /**
   * Fetch order book for a single token
   */
  async getOrderBook(tokenId: string): Promise<OrderBookSummary> {
    return this.clobRequest<OrderBookSummary>('/book', { token_id: tokenId })
  }

  /**
   * Fetch order books for multiple tokens in parallel
   * Returns a Map of tokenId -> OrderBookSummary
   * Failed requests are silently omitted from the result
   */
  async getOrderBooks(
    tokenIds: string[]
  ): Promise<Map<string, OrderBookSummary>> {
    const results = await Promise.allSettled(
      tokenIds.map((tokenId) => this.getOrderBook(tokenId))
    )

    const orderBooks = new Map<string, OrderBookSummary>()

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        const tokenId = tokenIds[index]
        if (tokenId !== undefined) {
          orderBooks.set(tokenId, result.value)
        }
      }
    })

    return orderBooks
  }

  /**
   * Convert GetMarketsParams to a record type for the API request
   */
  private convertMarketsParams(
    params?: GetMarketsParams
  ): Record<string, string | number | boolean> | undefined {
    if (!params) {
      return undefined
    }
    const result: Record<string, string | number | boolean> = {}
    if (params.active !== undefined) {
      result['active'] = params.active
    }
    if (params.closed !== undefined) {
      result['closed'] = params.closed
    }
    if (params.limit !== undefined) {
      result['limit'] = params.limit
    }
    if (params.offset !== undefined) {
      result['offset'] = params.offset
    }
    return result
  }

  /**
   * Fetch all markets from Gamma API
   */
  async getMarkets(params?: GetMarketsParams): Promise<GammaMarket[]> {
    return this.gammaRequest<GammaMarket[]>(
      '/markets',
      this.convertMarketsParams(params)
    )
  }

  /**
   * Fetch a market by its slug
   */
  async getMarketBySlug(slug: string): Promise<GammaMarket | null> {
    const url = new URL(`/markets/slug/${slug}`, this.gammaBaseUrl)

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      if (response.status === HTTP_NOT_FOUND) {
        return null
      }
      throw new Error(
        `Failed to fetch market: ${response.status} ${response.statusText}`
      )
    }

    return response.json() as Promise<GammaMarket>
  }

  /**
   * Fetch midpoint price for a token
   */
  async getMidpoint(tokenId: string): Promise<number> {
    const response = await this.clobRequest<MidpointResponse>('/midpoint', {
      token_id: tokenId,
    })
    return parseFloat(response.mid)
  }

  /**
   * Fetch spread for a token
   */
  async getSpread(tokenId: string): Promise<number> {
    const response = await this.clobRequest<SpreadResponse>('/spread', {
      token_id: tokenId,
    })
    return parseFloat(response.spread)
  }

  /**
   * Search markets by query string
   */
  async searchMarkets(query: string): Promise<GammaMarket[]> {
    return this.gammaRequest<GammaMarket[]>('/markets', { _q: query })
  }

  /**
   * Fetch an event by its slug
   * Events are grouped markets (e.g., all teams in a championship)
   */
  async getEventBySlug(slug: string): Promise<GammaEvent | null> {
    const url = new URL(`/events/slug/${slug}`, this.gammaBaseUrl)

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      if (response.status === HTTP_NOT_FOUND) {
        return null
      }
      throw new Error(
        `Failed to fetch event: ${response.status} ${response.statusText}`
      )
    }

    return response.json() as Promise<GammaEvent>
  }

  /**
   * Convert an event to a GammaMarket format for analysis
   * This creates a synthetic market with all event outcomes as tokens
   */
  eventToMarket(event: GammaEvent): GammaMarket {
    // Extract unique outcomes from all markets in the event
    // Each market in a negRisk event has Yes/No for one outcome
    const tokens: GammaMarket['tokens'] = []

    for (const market of event.markets) {
      // Skip closed/resolved markets with no active trading
      if (market.closed && !market.active) {
        continue
      }

      // For multi-outcome events, use the groupItemTitle or parse from question
      const groupTitle =
        (market as GammaMarket & { groupItemTitle?: string }).groupItemTitle ||
        this.extractTeamName(market.question)

      // Get price from outcomePrices if available
      let price = 0
      const marketAny = market as GammaMarket & { outcomePrices?: string }
      if (marketAny.outcomePrices) {
        try {
          const prices = JSON.parse(marketAny.outcomePrices)
          price = parseFloat(prices[0]) || 0
        } catch {
          // Use token price if available
          price = market.tokens?.[0]?.price || 0
        }
      }

      // Get the Yes token from this market's tokens
      const yesToken = market.tokens?.find(
        (t) => t.outcome === 'Yes' || t.outcome === groupTitle
      )
      const tokenId = yesToken?.token_id || market.tokens?.[0]?.token_id || ''

      if (tokenId && groupTitle) {
        tokens.push({
          token_id: tokenId,
          outcome: groupTitle,
          price: price,
        })
      }
    }

    return {
      id: parseInt(event.id) || 0,
      question: event.title,
      slug: event.slug,
      conditionId: event.id,
      active: event.active,
      closed: event.closed,
      createdAt: event.markets?.[0]?.createdAt || new Date().toISOString(),
      endDate: event.endDate,
      tokens,
      tags: event.tags,
    }
  }

  /**
   * Extract team name from a question like "Will the Buffalo Bills win Super Bowl 2026?"
   */
  private extractTeamName(question: string): string {
    // Match patterns like "Will the X win" or "Will X win"
    const match = question.match(/Will (?:the )?(.+?) win/i)
    if (match && match[1]) {
      return match[1]
    }
    // Fallback: return a truncated question
    return question.slice(0, 30)
  }
}
