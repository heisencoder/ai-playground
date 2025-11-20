# Heisencoder Blog - Minimal GitHub Pages Version

This is a **minimal, guaranteed-to-work** version of the blog using only basic GitHub Pages features.

## What's Different from blog_site/

- Uses default `minima` theme (not Minimal Mistakes)
- Only essential plugins (feed, seo-tag)
- No custom CSS
- No navigation configuration
- No archive pages
- **Should build successfully on GitHub Pages with zero issues**

## Deployment

Copy this entire directory to your GitHub repository:

```bash
# Option 1: Direct to heisencoder.github.io
cd heisencoder.github.io
cp -r /path/to/blog_minimal blog/
git add blog/
git commit -m "Add minimal blog version"
git push origin main
```

Access at: `https://heisencoder.github.io/blog`

## Upgrading

Once this basic version works, you can gradually add features:
1. Switch to a better theme
2. Add navigation
3. Add archive pages
4. Add custom CSS

But this minimal version should just work.

## Contents

- 40 blog posts (2007-2012)
- All comments preserved
- Simple default theme
- Zero configuration issues
