# Blog Import Plan: Blogger to GitHub Pages

## Overview
This document outlines the plan to migrate the heisencoder.net blog from Google Blogger (circa 2008) to GitHub Pages, including DNS migration from GoDaddy/Google Workspace.

---

## Phase 1: Assessment & Preparation

### 1.1 Blog Content Audit
- [ ] Count total number of posts on heisencoder.net
- [ ] Identify post categories/labels
- [ ] Document media assets (images, videos, attachments)
- [ ] Check for custom pages (About, Contact, etc.)
- [ ] Note any custom widgets or JavaScript
- [ ] Review comment system (Blogger comments vs external like Disqus)
- [ ] Identify any embedded content (YouTube, code snippets, etc.)

### 1.2 Technical Decisions
**Static Site Generator:** Choose from:
- **Jekyll** (default GitHub Pages, Ruby-based)
- **Hugo** (faster builds, Go-based)
- **Eleventy** (11ty, JavaScript-based, flexible)
- **Gatsby** (React-based, modern)

**Recommendation:** Jekyll for simplest GitHub Pages integration

---

## Phase 2: Export from Blogger

### 2.1 Export Blog Content
**Method 1: Official Blogger Export**
1. Log into Blogger dashboard
2. Navigate to Settings → Other → Import & back up
3. Click "Back up content"
4. Download XML file (Atom format)

**What's included:**
- All posts with HTML content
- Comments
- Post metadata (dates, labels, authors)

**What's NOT included:**
- Template/theme customization
- Uploaded images (hosted on Google servers, referenced by URL)
- Custom widgets

### 2.2 Handle Media Assets
**Options:**
1. **Keep on Google servers** (simplest, but dependent on Google)
2. **Download and re-host on GitHub** (most reliable)
   - Use tool like `wget` or Python script to download all images
   - Update image URLs in posts to point to new locations
3. **Migrate to CDN** (e.g., Cloudflare R2, AWS S3)

---

## Phase 3: Convert to GitHub Pages Format

### 3.1 Convert Blogger XML to Jekyll/Markdown

**Tools:**
- **blogger-to-jekyll** (Ruby gem): `gem install blogger_to_jekyll`
- **blog2md** (Python): Converts various blog formats to Markdown
- **exitwp** (Python): Specialized Blogger/WordPress to Jekyll converter
- **Custom script**: Python/Node.js script for full control

**Recommended: exitwp or custom Python script**

**Conversion tasks:**
- Parse Blogger XML export
- Convert each post to Markdown with YAML front matter
- Preserve post dates, titles, tags/categories
- Convert HTML content to Markdown (or keep as HTML if complex)
- Update internal links
- Handle image URLs
- Extract and convert comments (if keeping them)

### 3.2 Set Up Jekyll Site Structure
```
blog/
├── _config.yml          # Jekyll configuration
├── _posts/              # Blog posts (YYYY-MM-DD-title.md)
├── _layouts/            # Page templates
├── _includes/           # Reusable components
├── assets/              # CSS, JS, images
│   ├── css/
│   ├── js/
│   └── images/
├── about.md             # About page
├── index.html           # Homepage
└── CNAME                # Custom domain file
```

### 3.3 Theme Selection
- Use existing Jekyll theme (e.g., Minima, Minimal Mistakes)
- Port existing Blogger theme (time-intensive)
- Create custom theme
- Consider mobile responsiveness and modern web standards

---

## Phase 4: GitHub Pages Setup

### 4.1 Create GitHub Repository
**Options:**
1. **User/Organization site:** `heisencoder.github.io`
   - Repository name: `<username>.github.io`
   - Default URL: `https://heisencoder.github.io`

2. **Project site:** Separate repository
   - Any repository name (e.g., `blog`)
   - Default URL: `https://heisencoder.github.io/blog`

**Recommendation:** User site for cleaner URLs

### 4.2 Configure Jekyll
Create `_config.yml`:
```yaml
title: Heisencoder
description: [Your blog description]
url: "https://heisencoder.net"
baseurl: ""
permalink: /:year/:month/:day/:title/

# Build settings
markdown: kramdown
theme: minima

# Plugins
plugins:
  - jekyll-feed
  - jekyll-sitemap
  - jekyll-seo-tag
```

### 4.3 Deploy to GitHub Pages
1. Push Jekyll site to GitHub repository
2. Enable GitHub Pages in repository settings
3. Select source branch (usually `main` or `gh-pages`)
4. Wait for initial build (~1-2 minutes)
5. Verify site at `https://<username>.github.io`

---

## Phase 5: DNS Configuration & Custom Domain

### 5.1 Configure GitHub Pages for Custom Domain
1. In repository settings → Pages → Custom domain
2. Enter: `heisencoder.net` (or `www.heisencoder.net`)
3. GitHub will create a `CNAME` file in repository root
4. Enable "Enforce HTTPS" (after DNS propagates)

### 5.2 GoDaddy/Google Workspace DNS Changes

**Option A: Apex domain (heisencoder.net)**
Add A records pointing to GitHub Pages IPs:
```
Type: A
Name: @
Value: 185.199.108.153
TTL: 600 (or default)

Type: A
Name: @
Value: 185.199.109.153

Type: A
Name: @
Value: 185.199.110.153

Type: A
Name: @
Value: 185.199.111.153
```

**Option B: WWW subdomain (www.heisencoder.net)**
```
Type: CNAME
Name: www
Value: <username>.github.io
TTL: 600
```

**Recommended:** Configure BOTH
- Use A records for apex domain
- Add CNAME for www subdomain
- In GitHub Pages settings, choose which is primary

### 5.3 Email Considerations
**IMPORTANT:** If using Google Workspace for email (@heisencoder.net), ensure MX records are preserved:
```
Type: MX
Priority: 1
Value: smtp.google.com (or similar)
```

Do NOT delete existing MX, TXT, or other records needed for email!

### 5.4 DNS Verification & Propagation
1. Update DNS records in GoDaddy/Google Workspace console
2. Use `dig` or `nslookup` to verify changes:
   ```
   dig heisencoder.net +short
   dig www.heisencoder.net +short
   ```
3. Wait 24-48 hours for full DNS propagation
4. Test from multiple locations: https://www.whatsmydns.net/

---

## Phase 6: URL Preservation & Redirects

### 6.1 Maintain Blogger URL Structure
Blogger typically uses:
- `/YYYY/MM/post-title.html`
- Or custom domain patterns

**Jekyll permalink options:**
```yaml
permalink: /:year/:month/:day/:title/  # Without .html
permalink: /:year/:month/:title.html    # With .html (closer to Blogger)
```

### 6.2 Set Up Redirects
If URL structure changes:

**Method 1: Jekyll Redirect Plugin**
```yaml
# In _config.yml
plugins:
  - jekyll-redirect-from
```

**Method 2: Client-side redirects**
Create HTML files with meta refresh for old URLs

**Method 3: Keep Blogger as archive**
- Maintain Blogger site at subdomain (e.g., old.heisencoder.net)
- Add notice about new location

---

## Phase 7: Post-Migration Tasks

### 7.1 Content Verification
- [ ] Verify all posts migrated correctly
- [ ] Check image loading
- [ ] Test internal links
- [ ] Validate external links (fix broken ones)
- [ ] Ensure proper formatting (code blocks, quotes, etc.)
- [ ] Check RSS feed generation

### 7.2 SEO & Analytics
- [ ] Submit sitemap to Google Search Console
- [ ] Set up Google Analytics (or privacy-friendly alternative)
- [ ] Add structured data markup
- [ ] Update social media links
- [ ] Redirect or update links from external sites

### 7.3 Comments Migration
**Options:**
1. **Disqus:** Import Blogger comments, use Disqus on new site
2. **Static comments:** Convert to static files (e.g., Staticman)
3. **Archive only:** Keep old comments in HTML, disable on new site
4. **GitHub Issues/Discussions:** Use as comment system

---

## Phase 8: Decommission Blogger (Optional)

### 8.1 Maintain Dual Presence (Recommended initially)
- Keep Blogger site live for 6-12 months
- Add prominent notice redirecting to new site
- Use canonical tags to avoid duplicate content penalties

### 8.2 Full Decommission
After verifying migration success:
- Make Blogger blog private
- Or delete after final backup
- Ensure no email or services depend on Blogger

---

## Timeline Estimate

| Phase | Time | Effort |
|-------|------|--------|
| Assessment & Preparation | 2-4 hours | Low |
| Export from Blogger | 30 minutes | Low |
| Convert to Jekyll | 4-8 hours | Medium-High |
| GitHub Pages Setup | 1-2 hours | Low |
| DNS Configuration | 1 hour + 24-48h wait | Low |
| URL Preservation | 2-4 hours | Medium |
| Post-Migration Tasks | 4-6 hours | Medium |
| **Total** | **15-25 hours** + DNS propagation | **Medium** |

---

## Risks & Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Lost images (broken URLs) | High | Download all images during export |
| Broken internal links | Medium | Test and fix during conversion |
| SEO ranking loss | Medium | Maintain URL structure, use redirects |
| Email disruption | High | Carefully preserve MX records |
| Complex HTML not converting | Medium | Keep as HTML or manually fix |
| Comments lost | Low | Export and archive separately |

---

## Tools & Resources

### Conversion Tools
- **exitwp:** https://github.com/thomasf/exitwp
- **blog2md:** https://github.com/palaniraja/blog2md
- **blogger-cli:** https://github.com/hemanta212/blogger-cli

### Jekyll Resources
- **Jekyll Documentation:** https://jekyllrb.com/docs/
- **Jekyll Themes:** https://jekyllthemes.io/
- **GitHub Pages Docs:** https://docs.github.com/en/pages

### Testing Tools
- **DNS Propagation:** https://www.whatsmydns.net/
- **Broken Link Checker:** https://www.brokenlinkcheck.com/
- **Mobile Friendly Test:** https://search.google.com/test/mobile-friendly

---

## Next Steps

Before proceeding, please answer the clarifying questions in the following section.
