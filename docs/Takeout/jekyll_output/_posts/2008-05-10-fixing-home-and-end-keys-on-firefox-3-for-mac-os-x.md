---
title: "Fixing Home and End Keys on Firefox 3 for Mac OS X"
date: 2008-05-10 20:03:00 +0000
categories:
  - Programming
  - Mac
blogger_orig_url: /2008/05/fixing-home-and-end-keys-on-firefox-3.html
---

<div>
[Update: <a href="http://mavaball.net/wiki/index.php/Keyfixer">Keyfixer 0.4</a> is now available; see <a href="http://blog.mvballtech.com/2008/11/keyfixer-04-for-firefox-and-thunderbird.html">new blog post</a>]</div>
<div>
<br /></div>
Since I'm a heavy gmail user, I make significant use of the editor window in my web browser.  Ever since moving to a Macbook as my primary computer, I've been struggling with re-learning the Mac navigation key shortcuts.  Since I still use Windows a lot, I decided to instead <a href="http://heisencoder.net/2008/04/fixing-up-mac-key-bindings-for-windows.html">reconfigure the Mac shortcuts to emulate Windows shortcuts</a>.<br />
<br />
This strategy worked well, except for in Firefox, which doesn't respect the Mac DefaultKeyBinding.dict file.  For Firefox 2, I solved this problem by running <a href="http://www.starryhope.com/tech/2007/keyfixer-firefox-version/">Keyfixer as published by Starry Hope</a>.  Unfortunately, this stopped working for me when I updated to Firefox 2.0.0.14.  I switched to Safari for a while, but Safari's other bugs and "features" started to annoy me.  I wanted my Firefox back.<br />
<br />
After digging into what Keyfixer does, I've put together an updated version 0.3 that should work for Firefox 2.0.0.14 and Firefox 3.0 beta 5 (tested on Mac OS X 10.5.2).  The new solution performs patches instead of straight copies of the keymapping xml file, so I'm hoping it is more robust against future changes in Firefox.<br />
<br />
Click here to get <a href="http://matthew.v.ball.googlepages.com/keyfixer_firefox_0.3.dmg">Firefox Keyfixer 0.3</a>.<br />
<br />
Compared to version 0.2, this new version has the following updates:<br />
<ul>
<li>Support for both Firefox 2 and 3 (versions on or after May 2008)</li>
<li>Running the program twice will uninstall the patch.  This is useful when performing upgrades (Firefox won't upgrade if Keyfixer has been applied -- you have to remove it first)</li>
<li>PageUp and PageDown now moves the cursor instead of just moving the screen.  This is more consistent with Firefox on Windows.</li>
</ul>
As a side note, it looks like there was an intention in Firefox to follow standard Mac behavior by mapping Command-Left Arrow and Command-Right Arrow to move the cursor to the beginning and end of line, respectively.  However, this doesn't seem to work (at least when using gmail).  I'm interested to know if anyone else has seen this issue, because it's a bug.<br />
<br />
If you have any problems or questions with this version, please drop a comment and I'll see what I can do to help!

---

## Comments

<div class="archived-comments">

<div class="comment">
  <div class="comment-header">
    <strong>Anonymous</strong> <span class="comment-date">November 17, 2008 at 10:27 PM</span>
  </div>
  <div class="comment-body">
    I wish this was a firefox add-on.  Every time a new version of firefox is released, I have to install your fix.
  </div>
</div>

<div class="comment">
  <div class="comment-header">
    <strong>Unknown</strong> <span class="comment-date">August 19, 2009 at 05:20 PM</span>
  </div>
  <div class="comment-body">
    This has been replaced with a FireFox Plugin: https://addons.mozilla.org/en-US/firefox/addon/9796
  </div>
</div>
</div>
