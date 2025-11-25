---
layout: page
title: Archive
permalink: /archive/
---

[Home]({{ site.baseurl }}/) | Archive | [About]({{ site.baseurl }}/about/)

---

## All Posts

{% for post in site.posts %}
  * {{ post.date | date: "%Y-%m-%d" }} - [{{ post.title }}]({{ post.url | relative_url }})
{% endfor %}

---

## By Category

{% assign categories = site.posts | map: 'categories' | join: ',' | split: ',' | uniq | sort %}
{% for category in categories %}
  {% if category != "" %}
### {{ category }}

{% assign category_posts = site.posts | where_exp: "post", "post.categories contains category" %}
{% for post in category_posts %}
  * [{{ post.title }}]({{ post.url | relative_url }}) - {{ post.date | date: "%Y-%m-%d" }}
{% endfor %}
  {% endif %}
{% endfor %}
