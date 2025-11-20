---
title: "Can Firefox keyconfig fix Home/End buttons in textboxes?"
date: 2008-05-15 23:34:00 +0000
categories:
  - Programming
  - Mac
blogger_orig_url: /2008/05/can-firefox-keyconfig-fix-homeend.html
---

In poking around a little further with the problem of creating custom key mappings in Firefox for Mac, I found the plugin named keyconfig (see <a href="http://forums.mozillazine.org/viewtopic.php?t=72994">forum discussion</a>).  The plugin seems reasonable on the surface, but it's not actively supported, and its web presence is poor.  The best article I found was <a href="http://randomfoo.net/blog/id/4128">here on random($foo)</a>.  Unfortunately, the shortcuts it includes seem to be just for navigating, and not for text edit boxes.  I suspect it's possible to add custom code to make keyconfig do what <a href="http://www.starryhope.com/tech/2007/keyfixer-firefox-version/">Starry Hope's Firefox keyfixer</a> does -- remap the home/end keys to go to the beginning/end of the current line -- but I couldn't find out how without a lot of poking around.<br /><br />Keyfixer is a patch utility that modifies the Firefox configuration file named platformHTMLbindings.xml (kept inside the zip file named /Applications/Firefox.app/Contents/MacOS/chrome/toolkit.jar) with the appropriate key board shortcuts.  For example, these are the lines that change Home/End to go to the beginning/end of the current line instead of top/bottom of current edit window.<br /><quote></quote><pre name="code" class="xml"><br /><!-- Additions to fix home/end --><br /><handler event="keypress" keycode="VK_HOME" command="cmd_beginLine"/><br /><handler event="keypress" keycode="VK_END" command="cmd_endLine"/><br /><handler event="keypress" keycode="VK_HOME" modifiers="shift" command="cmd_selectBeginLine"/><br /><handler event="keypress" keycode="VK_END" modifiers="shift" command="cmd_selectEndLine"/><br /></pre><quote><br />The question I have is whether similar changes are possible within the keyconfig firefox plugin.  If this is possible, it would be much easier to maintain because you have to uninstall Firefox keyfixer before upgrading firefox.<br /><br />I see a lot of potential in keyconfig because it's a firefox plugin, and is something that should be in Firefox anyways, but right now I can't make it work better than the keyfixer patch.<br /></quote>

---

## Comments

<div class="archived-comments">

<div class="comment">
  <div class="comment-header">
    <strong>Anonymous</strong> <span class="comment-date">January 18, 2009 at 11:45 PM</span>
  </div>
  <div class="comment-body">
    Yes, using "keyconfig" is easy: just disable the existing mappings for Cmd-Left and Cmd-Right. See also http://www.macosxhints.com/article.php?story=20070511123925218
  </div>
</div>

<div class="comment">
  <div class="comment-header">
    <strong>Anonymous</strong> <span class="comment-date">October 03, 2011 at 07:39 PM</span>
  </div>
  <div class="comment-body">
    That works for some text editors, but for some reason it still doesn't enable the Home/End functionality in the Gmail editor, which is maddening. Does anyone know how to properly write the code above to work as custom keys in Keyconfig?
  </div>
</div>
</div>
