---
layout: home
title: Heisencoder
---

Home | [Archive]({{ site.baseurl }}/archive/) | [About]({{ site.baseurl }}/about/)

---

# Welcome to Heisencoder

A technical blog covering software development, cryptography, security, and programming languages.

Originally published 2007-2012 on Blogger, now preserved on GitHub Pages.

## Topics

- **Cryptography & Security**: Key management, encryption, security protocols
- **Programming Languages**: Ada, Ruby, Python, and language design
- **Developer Tools**: IDE customizations, productivity tips
- **Software Engineering**: Algorithms, best practices, architecture

---

## Recent Posts

<ul class="post-list">
  {% for post in site.posts %}
    <li>
      <span class="post-meta">{{ post.date | date: "%b %-d, %Y" }}</span>
      <h3>
        <a class="post-link" href="{{ post.url | relative_url }}">
          {{ post.title | escape }}
        </a>
      </h3>
      {% if post.categories %}
        <span class="post-categories">
          Categories: {{ post.categories | join: ", " }}
        </span>
      {% endif %}
    </li>
  {% endfor %}
</ul>
