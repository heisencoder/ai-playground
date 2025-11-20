#!/usr/bin/env python3
"""
Blogger to Jekyll Converter
Converts Google Blogger export (Atom XML) to Jekyll-compatible Markdown files
Includes static comments appended to each post
"""

import xml.etree.ElementTree as ET
import re
import os
import html
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Tuple
import urllib.parse

# Namespaces used in Blogger Atom feed
NAMESPACES = {
    'atom': 'http://www.w3.org/2005/Atom',
    'blogger': 'http://schemas.google.com/blogger/2018'
}

class BloggerToJekyll:
    def __init__(self, feed_path: str, output_dir: str):
        self.feed_path = feed_path
        self.output_dir = Path(output_dir)
        self.posts_dir = self.output_dir / '_posts'
        self.posts_dir.mkdir(parents=True, exist_ok=True)

        # Parse XML
        self.tree = ET.parse(feed_path)
        self.root = self.tree.getroot()

        # Storage for posts and comments
        self.posts = {}
        self.comments = {}
        self.image_urls = set()

    def parse_entries(self):
        """Parse all entries from the feed and separate posts from comments"""
        for entry in self.root.findall('atom:entry', NAMESPACES):
            entry_type = entry.find('blogger:type', NAMESPACES)

            if entry_type is not None:
                if entry_type.text == 'POST':
                    self._parse_post(entry)
                elif entry_type.text == 'COMMENT':
                    self._parse_comment(entry)

    def _parse_post(self, entry):
        """Parse a blog post entry"""
        post_id = entry.find('atom:id', NAMESPACES).text

        # Extract basic info
        title_elem = entry.find('atom:title', NAMESPACES)
        title = title_elem.text if title_elem is not None and title_elem.text else 'Untitled'

        content_elem = entry.find('atom:content', NAMESPACES)
        content = content_elem.text if content_elem is not None else ''

        published_elem = entry.find('atom:published', NAMESPACES)
        published = published_elem.text if published_elem is not None else None

        # Extract categories/tags
        categories = []
        for cat in entry.findall('atom:category', NAMESPACES):
            term = cat.get('term')
            if term:
                categories.append(term)

        # Extract filename (contains original Blogger URL path)
        filename_elem = entry.find('blogger:filename', NAMESPACES)
        original_path = filename_elem.text if filename_elem is not None else None

        # Extract image URLs from content
        if content:
            img_urls = re.findall(r'https?://[^"\s]+\.(?:jpg|jpeg|png|gif|bmp)', content, re.IGNORECASE)
            self.image_urls.update(img_urls)

        self.posts[post_id] = {
            'id': post_id,
            'title': title,
            'content': content,
            'published': published,
            'categories': categories,
            'original_path': original_path,
            'comments': []
        }

    def _parse_comment(self, entry):
        """Parse a comment entry"""
        parent_elem = entry.find('blogger:parent', NAMESPACES)
        if parent_elem is None:
            return

        parent_id = parent_elem.text

        # Extract comment details
        author_elem = entry.find('atom:author/atom:name', NAMESPACES)
        author = author_elem.text if author_elem is not None else 'Anonymous'

        content_elem = entry.find('atom:content', NAMESPACES)
        content = content_elem.text if content_elem is not None else ''

        published_elem = entry.find('atom:published', NAMESPACES)
        published = published_elem.text if published_elem is not None else None

        # Check if it's spam
        status_elem = entry.find('blogger:status', NAMESPACES)
        is_spam = status_elem is not None and status_elem.text == 'SPAM_COMMENT'

        if not is_spam:
            comment = {
                'author': author,
                'content': content,
                'published': published
            }

            if parent_id in self.posts:
                self.posts[parent_id]['comments'].append(comment)

    def _sanitize_filename(self, title: str) -> str:
        """Convert title to valid filename"""
        # Convert to lowercase and replace spaces with hyphens
        filename = title.lower()
        filename = re.sub(r'[^\w\s-]', '', filename)
        filename = re.sub(r'[-\s]+', '-', filename)
        return filename[:100]  # Limit length

    def _format_date(self, date_str: str) -> Tuple[str, str]:
        """Parse and format date for Jekyll"""
        if not date_str:
            # Use a default date if none provided
            return '2008-01-01', '2008-01-01 00:00:00 +0000'

        # Parse ISO format datetime
        dt = datetime.fromisoformat(date_str.replace('Z', '+00:00'))

        # Jekyll filename format
        jekyll_date = dt.strftime('%Y-%m-%d')

        # Full datetime for front matter
        full_date = dt.strftime('%Y-%m-%d %H:%M:%S %z')

        return jekyll_date, full_date

    def _convert_content(self, content: str) -> str:
        """Convert HTML content - we'll keep it as HTML within Markdown"""
        if not content:
            return ''

        # Unescape HTML entities
        content = html.unescape(content)

        # Update image URLs to local paths if they're in our Albums
        # (This is a placeholder - actual URL mapping would happen after downloading images)

        return content

    def _format_comments_html(self, comments: List[Dict]) -> str:
        """Format comments as static HTML to append to post"""
        if not comments:
            return ''

        # Sort comments by date
        comments_sorted = sorted(comments, key=lambda c: c['published'] or '')

        html_parts = [
            '\n\n---\n\n',
            '## Comments\n\n',
            '<div class="archived-comments">\n'
        ]

        for comment in comments_sorted:
            author = html.escape(comment['author'] or 'Anonymous')
            content = html.unescape(comment['content']) if comment['content'] else ''

            # Format date
            date_str = ''
            if comment['published']:
                dt = datetime.fromisoformat(comment['published'].replace('Z', '+00:00'))
                date_str = dt.strftime('%B %d, %Y at %I:%M %p')

            html_parts.append(f'''
<div class="comment">
  <div class="comment-header">
    <strong>{author}</strong> <span class="comment-date">{date_str}</span>
  </div>
  <div class="comment-body">
    {content}
  </div>
</div>
''')

        html_parts.append('</div>\n')

        return ''.join(html_parts)

    def convert_to_jekyll(self):
        """Convert all posts to Jekyll format"""
        print(f"Converting {len(self.posts)} posts...")

        for post_id, post in self.posts.items():
            try:
                jekyll_date, full_date = self._format_date(post['published'])
                filename = self._sanitize_filename(post['title'])
                filepath = self.posts_dir / f"{jekyll_date}-{filename}.md"

                # Create front matter
                front_matter = ['---']
                safe_title = post['title'].replace('"', '\\"')
                front_matter.append(f'title: "{safe_title}"')
                front_matter.append(f"date: {full_date}")

                if post['categories']:
                    front_matter.append('categories:')
                    for cat in post['categories']:
                        front_matter.append(f"  - {cat}")

                if post['original_path']:
                    front_matter.append(f"blogger_orig_url: {post['original_path']}")

                front_matter.append('---\n')

                # Combine content with comments
                content = self._convert_content(post['content'])
                comments_html = self._format_comments_html(post['comments'])

                full_content = '\n'.join(front_matter) + '\n' + content + comments_html

                # Write file
                with open(filepath, 'w', encoding='utf-8') as f:
                    f.write(full_content)

                print(f"  ✓ {filepath.name} ({len(post['comments'])} comments)")

            except Exception as e:
                import traceback
                print(f"  ✗ Error converting post '{post['title']}': {e}")
                traceback.print_exc()

    def generate_image_list(self):
        """Generate a list of image URLs that need to be downloaded"""
        image_list_path = self.output_dir / 'images_to_download.txt'

        with open(image_list_path, 'w', encoding='utf-8') as f:
            for url in sorted(self.image_urls):
                f.write(f"{url}\n")

        print(f"\nFound {len(self.image_urls)} image URLs")
        print(f"Image list saved to: {image_list_path}")

    def print_summary(self):
        """Print conversion summary"""
        total_comments = sum(len(post['comments']) for post in self.posts.values())

        print("\n" + "="*60)
        print("CONVERSION SUMMARY")
        print("="*60)
        print(f"Total posts: {len(self.posts)}")
        print(f"Total comments: {total_comments}")
        print(f"Image URLs found: {len(self.image_urls)}")
        print(f"Output directory: {self.posts_dir}")
        print("="*60)


def main():
    # Paths
    script_dir = Path(__file__).parent
    feed_path = script_dir / 'Blogger' / 'Blogs' / 'Heisencoder' / 'feed.atom'
    output_dir = script_dir / 'jekyll_output'

    print("Blogger to Jekyll Converter")
    print("="*60)
    print(f"Input: {feed_path}")
    print(f"Output: {output_dir}")
    print("="*60)

    # Create converter and run
    converter = BloggerToJekyll(str(feed_path), str(output_dir))
    converter.parse_entries()
    converter.convert_to_jekyll()
    converter.generate_image_list()
    converter.print_summary()

    print("\n✓ Conversion complete!")
    print(f"\nNext steps:")
    print(f"1. Review the generated posts in: {output_dir / '_posts'}")
    print(f"2. Download images listed in: {output_dir / 'images_to_download.txt'}")
    print(f"3. Update image URLs in posts to point to local images")


if __name__ == '__main__':
    main()
