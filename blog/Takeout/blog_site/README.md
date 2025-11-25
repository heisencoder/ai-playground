# Heisencoder Blog - GitHub Pages

This directory contains the complete Jekyll blog migrated from Blogger (2007-2012).

## Contents

- **40 blog posts** from 2007-2012
- **66 preserved comments** appended to posts as static HTML
- **Local images** from the original blog
- **Minimal Mistakes** theme configuration
- **Giscus** comments system for new posts

## Deployment Instructions

### Option 1: Copy to heisencoder.github.io Repository

1. Clone or navigate to your `heisencoder.github.io` repository
2. Create a `blog` subdirectory in the root
3. Copy all contents of this directory to `blog/`:
   ```bash
   cp -r blog_site/* ~/path/to/heisencoder.github.io/blog/
   ```

4. Commit and push:
   ```bash
   cd ~/path/to/heisencoder.github.io
   git add blog/
   git commit -m "Add migrated Heisencoder blog from Blogger"
   git push origin main
   ```

### Option 2: Direct Integration

If your heisencoder.github.io repository already has content in the root:

1. Copy `_posts/` to the repository root's `_posts/` directory
2. Copy `assets/` to merge with existing assets
3. Update the root `_config.yml` with blog-specific settings from this `_config.yml`
4. Adjust `baseurl` in configuration as needed

## Local Testing

Before deploying, test locally:

```bash
# Install dependencies
bundle install

# Serve locally
bundle exec jekyll serve --baseurl /blog

# View at: http://localhost:4000/blog
```

## Post-Deployment Tasks

### 1. Configure Giscus Comments

1. Enable GitHub Discussions in your heisencoder.github.io repository:
   - Go to Settings → General → Features
   - Check "Discussions"

2. Go to https://giscus.app/
3. Configure:
   - Repository: `heisencoder/heisencoder.github.io`
   - Discussion Category: Create "Blog Comments" category
   - Mapping: "Discussion title contains page pathname"

4. Copy the generated `repo_id` and `category_id`
5. Update `_config.yml`:
   ```yaml
   comments:
     giscus:
       repo_id: "YOUR_REPO_ID"
       category_id: "YOUR_CATEGORY_ID"
   ```

### 2. Configure Custom Domain (heisencoder.net)

See the main documentation in `docs/IMPORT_BLOG_PLAN.md` for DNS configuration.

In repository settings:
1. Go to Settings → Pages
2. Custom domain: `heisencoder.net`
3. Enable "Enforce HTTPS"

### 3. Update Image References (Optional)

Some posts reference images hosted on:
- Wikipedia (still accessible, no action needed)
- Blogger CDN (still accessible, but may change)

Local images are in `assets/images/blog/` and should work immediately.

### 4. Customize Theme

Edit `_config.yml` to customize:
- `minimal_mistakes_skin`: Choose from "air", "aqua", "contrast", "dark", "dirt", "neon", "mint", "plum", "sunrise"
- Author bio and links
- Analytics (optional)

Edit `assets/css/main.scss` to customize:
- Colors
- Comment styling
- Layout tweaks

### 5. Create Additional Pages

Consider adding:
- Categories page: `_pages/category-archive.md`
- Tags page: `_pages/tag-archive.md`
- Year archive: `_pages/year-archive.md`

## File Structure

```
blog_site/
├── _config.yml          # Jekyll configuration
├── _data/
│   └── navigation.yml   # Navigation menu
├── _pages/
│   └── about.md         # About page
├── _posts/              # 40 blog posts (YYYY-MM-DD-title.md)
├── assets/
│   ├── css/
│   │   └── main.scss    # Custom CSS for comments
│   └── images/
│       └── blog/        # Blog images
├── Gemfile              # Ruby dependencies
├── index.html           # Homepage
└── README.md            # This file
```

## Categories in Blog

The migrated posts use these categories:
- Cryptography
- Programming
- iDrone
- Key Management
- Security

## Notes

- Original Blogger URLs are preserved in front matter as `blogger_orig_url`
- Comments from the original blog are static HTML appended to posts
- New comments use Giscus (GitHub Discussions)
- All posts use Jekyll's default permalink structure: `/:year/:month/:day/:title/`

## Support

For issues or questions about the migration:
- See `docs/IMPORT_BLOG_PLAN.md` for the complete migration plan
- Check Jekyll docs: https://jekyllrb.com/docs/
- Minimal Mistakes theme docs: https://mmistakes.github.io/minimal-mistakes/
- Giscus docs: https://giscus.app/

---

**Migration completed:** November 2025
**Original blog:** heisencoder.net (Blogger, 2007-2012)
**New home:** heisencoder.github.io/blog
