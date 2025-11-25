# Blog Import Plan: Blogger to GitHub Pages

## Overview
This document outlines the plan to migrate the heisencoder.net blog from Google Blogger (circa 2008) to GitHub Pages at heisencoder.github.io/blog, including DNS migration from GoDaddy/Google Workspace.

## Key Decisions
- **Static Site Generator:** Jekyll (native GitHub Pages support)
- **Repository:** heisencoder.github.io (project blog at /blog subdirectory)
- **Theme:** Modern minimalist theme with light customization
- **Images:** Download all images to GitHub repository
- **URL Structure:** Use default Jekyll permalinks (no Blogger URL matching)
- **Comments:**
  - Old posts: Static comments appended to post content
  - New posts: Giscus (GitHub Discussions-based commenting system)
- **Email:** No email setup; contact via GitHub profile
- **Timeline:** Complete within 2 days

---

## Phase 1: Assessment & Preparation

### 1.1 Blog Content Audit
- [ ] Log into Blogger and count total posts
- [ ] List post categories/labels used
- [ ] Document number of images and media files
- [ ] Check for custom pages (About, Contact, etc.)
- [ ] Identify embedded content (YouTube videos, code snippets, etc.)
- [ ] Confirm all posts have Blogger comments to preserve

### 1.2 Local Environment Setup
- [ ] Install Ruby and Jekyll locally: `gem install bundler jekyll`
- [ ] Install Python 3 for conversion scripts
- [ ] Install wget or curl for downloading images
- [ ] Ensure Git is configured for GitHub

---

## Phase 2: Export from Blogger

### 2.1 Export Blog Content
1. [ ] Log into Blogger dashboard at https://www.blogger.com/
2. [ ] Navigate to Settings → Other → Import & back up
3. [ ] Click "Back up content"
4. [ ] Download XML file (Atom format) - save as `blogger-export.xml`
5. [ ] Save backup copy of XML file

**What's included:**
- All posts with HTML content
- Comments with author names and timestamps
- Post metadata (dates, labels, authors)

**What's NOT included:**
- Uploaded images (hosted on Google servers, referenced by URL)
- Template/theme customization

### 2.2 Download All Images
- [ ] Extract all image URLs from the XML export
- [ ] Create Python script to download images:
  ```python
  # Download all images from Blogger
  # Save to assets/images/blogger/
  # Create URL mapping file for conversion
  ```
- [ ] Download all images to local directory
- [ ] Verify all images downloaded successfully

---

## Phase 3: Convert to GitHub Pages Format

### 3.1 Set Up Jekyll Site in heisencoder.github.io Repository

- [ ] Clone or create `heisencoder.github.io` repository
- [ ] Create `blog/` subdirectory for the blog
- [ ] Initialize Jekyll site structure in blog/:
  ```
  blog/
  ├── _config.yml          # Jekyll configuration
  ├── _posts/              # Blog posts (YYYY-MM-DD-title.md)
  ├── _layouts/            # Custom layouts
  ├── _includes/           # Reusable components
  ├── assets/              # CSS, JS, images
  │   ├── css/
  │   ├── js/
  │   └── images/
  │       └── blogger/     # Downloaded Blogger images
  ├── about.md             # About page
  └── index.html           # Blog homepage
  ```

### 3.2 Choose and Configure Theme

**Selected Theme: Minimal Mistakes**
- Modern, minimalist, highly customizable
- Excellent documentation
- Built-in support for comments, analytics, social sharing
- Mobile responsive

- [ ] Add theme to `_config.yml` or Gemfile
- [ ] Customize colors, fonts, and layout
- [ ] Add custom navigation
- [ ] Configure social links to GitHub profile

### 3.3 Convert Blogger XML to Jekyll Posts

**Tool: Custom Python Script** (most control for comments)

- [ ] Create Python conversion script that:
  1. Parses `blogger-export.xml`
  2. For each post:
     - Extracts title, date, content, labels
     - Creates YAML front matter
     - Converts HTML to Markdown (or keeps HTML in content)
     - Updates image URLs to local paths
     - Appends comments as static HTML at end of post
     - Saves as `_posts/YYYY-MM-DD-title.md`
  3. Creates tag/category pages

- [ ] Run conversion script
- [ ] Manually review a few posts for formatting issues
- [ ] Fix any problematic conversions

---

## Phase 4: GitHub Pages Setup

### 4.1 Configure Jekyll for /blog Subdirectory

Create `blog/_config.yml`:
```yaml
title: Heisencoder
description: "Technical blog about software development and AI"
url: "https://heisencoder.github.io"
baseurl: "/blog"
permalink: /:year/:month/:day/:title/

# Author
author:
  name: "Heisencoder"
  bio: "Software engineer and AI enthusiast"
  github: "heisencoder"

# Build settings
markdown: kramdown
remote_theme: mmistakes/minimal-mistakes

# Plugins (GitHub Pages compatible)
plugins:
  - jekyll-feed
  - jekyll-sitemap
  - jekyll-seo-tag
  - jekyll-include-cache

# Comments (Giscus - GitHub Discussions)
comments:
  provider: "giscus"
  giscus:
    repo: "heisencoder/heisencoder.github.io"
    repo_id: "[GET FROM GISCUS.APP]"
    category: "Blog Comments"
    category_id: "[GET FROM GISCUS.APP]"
```

### 4.2 Test Locally
- [ ] Run `bundle install` in blog/ directory
- [ ] Run `bundle exec jekyll serve --baseurl /blog`
- [ ] Open http://localhost:4000/blog
- [ ] Verify all posts render correctly
- [ ] Check image loading
- [ ] Test navigation and links

### 4.3 Deploy to GitHub Pages
- [ ] Commit all changes to heisencoder.github.io repository
- [ ] Push to GitHub: `git push origin main`
- [ ] Go to repository Settings → Pages
- [ ] Ensure source is set to "Deploy from branch: main"
- [ ] Wait for build to complete (~2-3 minutes)
- [ ] Visit https://heisencoder.github.io/blog
- [ ] Verify site is live and functioning

---

## Phase 5: DNS Configuration & Custom Domain

### 5.1 Custom Domain Strategy

**Decision:** Point heisencoder.net to the entire heisencoder.github.io site
- Blog will be at: `heisencoder.net/blog`
- Root can have a landing page or redirect to /blog
- Future projects can be at: `heisencoder.net/other-project`

### 5.2 Configure GitHub Pages for Custom Domain

- [ ] Go to heisencoder.github.io repository settings
- [ ] Navigate to Settings → Pages → Custom domain
- [ ] Enter: `heisencoder.net`
- [ ] Click Save (GitHub will create `CNAME` file in repository root)
- [ ] Wait for DNS check to complete
- [ ] Enable "Enforce HTTPS" checkbox (after DNS propagates)

### 5.3 GoDaddy/Google Workspace DNS Configuration

**Add A Records for GitHub Pages:**
- [ ] Log into GoDaddy or Google Domains console
- [ ] Navigate to DNS settings for heisencoder.net
- [ ] Add four A records pointing to GitHub Pages IPs:

```
Type: A
Name: @ (or heisencoder.net)
Value: 185.199.108.153
TTL: 600

Type: A
Name: @ (or heisencoder.net)
Value: 185.199.109.153
TTL: 600

Type: A
Name: @ (or heisencoder.net)
Value: 185.199.110.153
TTL: 600

Type: A
Name: @ (or heisencoder.net)
Value: 185.199.111.153
TTL: 600
```

**Add CNAME for www subdomain:**
```
Type: CNAME
Name: www
Value: heisencoder.github.io
TTL: 600
```

**IMPORTANT:** Do NOT delete any existing records you need!
- Keep any MX records if using email
- Keep any TXT records for domain verification
- Keep any other records for existing services

### 5.4 DNS Verification & Propagation

- [ ] Save DNS changes in GoDaddy/Google console
- [ ] Wait 5-10 minutes for initial propagation
- [ ] Verify DNS changes using dig:
  ```bash
  dig heisencoder.net +short
  # Should show GitHub Pages IPs (185.199.108-111.153)

  dig www.heisencoder.net +short
  # Should show heisencoder.github.io
  ```
- [ ] Check global propagation: https://www.whatsmydns.net/
- [ ] Wait up to 24-48 hours for full global propagation
- [ ] Test accessing https://heisencoder.net in browser
- [ ] Verify HTTPS certificate is valid (GitHub provides free SSL)

---

## Phase 6: Comments System Setup

### 6.1 Configure Giscus for New Posts

Giscus uses GitHub Discussions as a comment backend - comments are stored as GitHub Discussions, no database needed.

- [ ] Go to https://giscus.app/
- [ ] Enter repository: `heisencoder/heisencoder.github.io`
- [ ] Enable GitHub Discussions in repository if not already enabled
- [ ] Choose discussion category: "Blog Comments" (create if needed)
- [ ] Select mapping: "pathname" (maps URL to discussion)
- [ ] Copy the generated configuration values
- [ ] Update `blog/_config.yml` with repo_id and category_id
- [ ] Test commenting on a new post

### 6.2 Add Blogger Redirect Notice

Since URL structure will change and we're not preserving old URLs:

- [ ] Add notice to Blogger site:
  ```
  "This blog has moved to heisencoder.net/blog
  Please update your bookmarks!"
  ```
- [ ] Consider keeping Blogger site live for 3-6 months as archive
- [ ] Add canonical links in Blogger posts pointing to new URLs (optional)

---

## Phase 7: Post-Migration Tasks

### 7.1 Content Verification
- [ ] Review all migrated posts for correct formatting
- [ ] Verify all images load correctly
- [ ] Test internal links between posts
- [ ] Check code blocks have proper syntax highlighting
- [ ] Ensure static comments display properly on old posts
- [ ] Verify RSS feed at https://heisencoder.net/blog/feed.xml

### 7.2 Create Landing Pages
- [ ] Create root `index.html` at heisencoder.github.io (redirects to /blog or landing page)
- [ ] Create `blog/about.md` with your bio and contact info
- [ ] Add links to GitHub profile for contact
- [ ] Create archive/category pages for post organization

### 7.3 SEO & Discoverability
- [ ] Submit sitemap to Google Search Console
  - Sitemap URL: https://heisencoder.net/sitemap.xml
- [ ] Set up basic analytics (optional - Plausible, Fathom, or GA4)
- [ ] Update any social media profiles with new blog URL
- [ ] Add meta descriptions to posts (in front matter)

### 7.4 Theme Customization
- [ ] Customize color scheme to make it unique
- [ ] Add custom fonts if desired
- [ ] Add favicon
- [ ] Customize footer with copyright and links
- [ ] Add social sharing buttons (built into Minimal Mistakes)

---

## Timeline Estimate (2-Day Sprint)

### Day 1: Export, Convert, and Setup (8-10 hours)
| Task | Time | Status |
|------|------|--------|
| Blog audit & export from Blogger | 30 min | [ ] |
| Download all images | 1 hour | [ ] |
| Set up Jekyll site structure | 1 hour | [ ] |
| Write Python conversion script | 2 hours | [ ] |
| Run conversion & fix issues | 2-3 hours | [ ] |
| Configure theme & customize | 2 hours | [ ] |
| Test locally | 30 min | [ ] |
| Push to GitHub & deploy | 30 min | [ ] |

### Day 2: DNS, Polish, and Launch (6-8 hours)
| Task | Time | Status |
|------|------|--------|
| Configure DNS in GoDaddy | 30 min | [ ] |
| Configure custom domain in GitHub | 15 min | [ ] |
| Set up Giscus comments | 30 min | [ ] |
| Create landing pages (root, about) | 1 hour | [ ] |
| Content verification & fixes | 2-3 hours | [ ] |
| Theme customization (colors, fonts) | 1-2 hours | [ ] |
| SEO setup (meta tags, sitemap) | 1 hour | [ ] |
| Final testing & launch | 30 min | [ ] |

**Note:** DNS propagation (24-48 hours) runs in background - site accessible via heisencoder.github.io/blog immediately, heisencoder.net/blog after propagation.

---

## Risks & Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Lost images (broken URLs) | High | Download all images to repo |
| Broken internal links | Medium | Test during conversion |
| Complex HTML not converting cleanly | Medium | Keep as HTML in Markdown |
| Comments formatting issues | Low | Static HTML append is simple |
| DNS misconfiguration | Medium | Test with dig before finalizing |
| Theme not building on GitHub | Medium | Test locally first with same config |

---

## Tools & Resources

### Required Tools
- **Ruby & Jekyll:** `gem install bundler jekyll`
- **Python 3:** For conversion script (standard library XML parsing)
- **Git:** For version control and GitHub
- **wget or curl:** For downloading images

### Key Resources
- **Jekyll Documentation:** https://jekyllrb.com/docs/
- **Minimal Mistakes Theme:** https://mmistakes.github.io/minimal-mistakes/
- **GitHub Pages Docs:** https://docs.github.com/en/pages
- **Giscus (Comments):** https://giscus.app/
- **DNS Propagation Checker:** https://www.whatsmydns.net/

### Python Libraries (for conversion script)
```bash
# Only standard library needed:
import xml.etree.ElementTree as ET
import re
import os
import urllib.request
```

---

## Immediate Next Steps

Ready to begin? Here's what to do first:

1. **Export from Blogger** (15 minutes)
   - Go to https://www.blogger.com/
   - Settings → Other → Import & back up → "Back up content"
   - Save the XML file

2. **Audit your blog** (15 minutes)
   - Count how many posts you have
   - Note if there are many images
   - Check if there are special pages to preserve

3. **Set up local environment** (30 minutes)
   - Install Ruby and Jekyll
   - Install Python 3
   - Clone or create heisencoder.github.io repository

4. **Share the XML export**
   - Provide the Blogger XML export file
   - Share any specific customization requirements

Once you've completed these steps, we can proceed with the Python conversion script and Jekyll setup!

---

## Questions?

If you have any questions about this plan or need clarification on any steps, please ask before proceeding. This plan is designed to be executed in 2 days, but can be adjusted based on the complexity of your blog content.
