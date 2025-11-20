---
title: "Adding Syntax Highlighting to Blogger"
date: 2009-01-18 22:58:00 +0000
categories:
  - Programming
  - HOWTO
  - Web
blogger_orig_url: /2009/01/adding-syntax-highlighting-to-blogger.html
---

(Note: This article is somewhat dated because <a href="http://alexgorbatchev.com/wiki/SyntaxHighlighter">SyntaxHighlighter 2.0</a> was released in February 2009.  However, this article is still valid for those who prefer the older 1.5.x version or who don't want to upgrade)<br />
<br />
As we all know, any self-respecting blogger needs some kind of syntax-highlighting plug-in before posting source code on a blog.  I've been amiss in this regard, but decided it was high time to correct this particular deficiency.<br />
<br />
From doing a little web searching, it looks like the favorite choice is a Java script tool called <a href="http://code.google.com/p/syntaxhighlighter/">syntaxhighlighter</a>.  As of this writing, syntaxhighlighter hasn't been updated since version 1.5.1 was release in August 2007.  It's been surprisingly robust all this time, except that it appears to have some trouble with scrollbars in the more recent Firefox versions, and Safari can be pegged at 100% CPU utilization.  Also, the documentation is a little sparse.<br />
<br />
That said, here are the steps I followed to make syntax highlighting work with Blogger (the host for this blog) using the syntaxhighlighter suite of javascript and css code.<br />
<br />
In the blogger back end (reachable by logging into your blog and clicking "New Post" or "Customize", or other methods), click the"Layout" tab, then the "Edit HTML" sub-tab.  Within the textbox within the "Edit Template" section, do the following:<br />
<br />
1. Go to <a href="http://syntaxhighlighter.googlecode.com/svn/trunk/Styles/SyntaxHighlighter.css">http://syntaxhighlighter.googlecode.com/svn/trunk/Styles/SyntaxHighlighter.css</a>, then perform a "select all" and "copy".  The css information is now in the clipboard.<br />
<br />
2. Paste the css information at the end of the css section of your blogger html template (i.e., after <code><b:skin><!--[CDATA[/*</code> and before <code>]]--></b:skin></code>).<br />
<br />
3. [Updated March 25, 2009 to include closing script tags]  Before the <code></head></code> tag, paste the following:<br />
<pre class="xml" name="code"><!-- Add-in CSS for syntax highlighting -->
<script src='http://syntaxhighlighter.googlecode.com/svn/trunk/Scripts/shCore.js' type='text/javascript'></script>
<script src='http://syntaxhighlighter.googlecode.com/svn/trunk/Scripts/shBrushCpp.js' type='text/javascript'></script>
<script src='http://syntaxhighlighter.googlecode.com/svn/trunk/Scripts/shBrushCSharp.js' type='text/javascript'></script>
<script src='http://syntaxhighlighter.googlecode.com/svn/trunk/Scripts/shBrushCss.js' type='text/javascript'></script>
<script src='http://syntaxhighlighter.googlecode.com/svn/trunk/Scripts/shBrushDelphi.js' type='text/javascript'></script>
<script src='http://syntaxhighlighter.googlecode.com/svn/trunk/Scripts/shBrushJava.js' type='text/javascript'></script>
<script src='http://syntaxhighlighter.googlecode.com/svn/trunk/Scripts/shBrushJScript.js' type='text/javascript'></script>
<script src='http://syntaxhighlighter.googlecode.com/svn/trunk/Scripts/shBrushPhp.js' type='text/javascript'></script>
<script src='http://syntaxhighlighter.googlecode.com/svn/trunk/Scripts/shBrushPython.js' type='text/javascript'></script>
<script src='http://syntaxhighlighter.googlecode.com/svn/trunk/Scripts/shBrushRuby.js' type='text/javascript'></script>
<script src='http://syntaxhighlighter.googlecode.com/svn/trunk/Scripts/shBrushSql.js' type='text/javascript'></script>
<script src='http://syntaxhighlighter.googlecode.com/svn/trunk/Scripts/shBrushVb.js' type='text/javascript'></script>
<script src='http://syntaxhighlighter.googlecode.com/svn/trunk/Scripts/shBrushXml.js' type='text/javascript'></script></pre>Feel free to remove lines for languages you'll never use (for example, Delphi) -- it will save some loading time.<br />
<br />
4. [Updated to add final /script] Before the <code></body></code> tag, insert the following:<br />
<pre class="xml" name="code"><!-- Add-in Script for syntax highlighting -->
<script language='javascript'>
dp.SyntaxHighlighter.BloggerMode();
dp.SyntaxHighlighter.HighlightAll('code');
</script>
</pre><br />
5. Use the "Preview" button to make sure your website is correct, then click "Save Template".<br />
<br />
6. When composing a blog entry that contains source code, click the "Edit Html" tab and put your source code (with html-escaped characters) between these tags:<br />
<pre class="xml" name="code"><pre name="code" class="cpp">
...Your html-escaped code goes here...
</pre></pre><br />
Substitute "cpp" with whatever language you're using (<a href="http://code.google.com/p/syntaxhighlighter/wiki/Languages">full list</a>).  (Choices: cpp, c, c++, c#, c-sharp, csharp, css, delphi, pascal, java, js, jscript, javascript, php, py, python, rb, ruby, rails, ror, sql, vb, vb.net, xml, html, xhtml, xslt)<br />
<br />
For performing the HTML escaping, you can get a good list of tools by searching for 'html esaper' or a similar term.  <a href="http://www.accessify.com/tools-and-wizards/developer-tools/quick-escape/default.php">Here's the one</a> I used while writing this post.<br />
<br />
Let me know how it works!<br />
<br />
Notes:<br />
<ol><li>Step 2 is a work-around to accommodate Firefox browsers, which for some reason refuse to load the css when linked, because it thinks the type is mime/plain instead of mime/css (I don't personally understand this -- I'm just using a workaround recommended from elsewhere)</li>
<li>See <a href="http://code.google.com/p/syntaxhighlighter/w/list">full documentation here</a> for Syntaxhighlighter.<br />
</li>
</ol><br />
Sources:<br />
<ol><li><a href="http://urenjoy.blogspot.com/2008/10/publish-source-code-in-blogger.html">Enjoy Web Tech - Publish Source code in Blogger</a></li>
<li><a href="http://developertips.blogspot.com/2007/08/syntaxhighlighter-on-blogger.html">Using Syntaxhighlighter on Blogger</a></li>
</ol>

---

## Comments

<div class="archived-comments">

<div class="comment">
  <div class="comment-header">
    <strong>Mr.Toàn</strong> <span class="comment-date">March 16, 2009 at 05:26 PM</span>
  </div>
  <div class="comment-body">
    Very very useful<BR/>Thanks
  </div>
</div>

<div class="comment">
  <div class="comment-header">
    <strong>jonz</strong> <span class="comment-date">March 25, 2009 at 12:07 AM</span>
  </div>
  <div class="comment-body">
    For anyone who is having trouble I wanted to note that this did not work for me until I made the script tags valid XML by having them not be self-closing, ie <script></script> instead of <script />.<BR/><BR/>Thanks for the instructions, getting this working was pretty painless, now it's time to see how many lines of code it takes to throttle the js engine ;)
  </div>
</div>

<div class="comment">
  <div class="comment-header">
    <strong>Ferdinand</strong> <span class="comment-date">July 04, 2009 at 08:45 AM</span>
  </div>
  <div class="comment-body">
    great tut. thanksss.
  </div>
</div>

<div class="comment">
  <div class="comment-header">
    <strong>See Sharp</strong> <span class="comment-date">January 10, 2010 at 04:30 AM</span>
  </div>
  <div class="comment-body">
    Hi, Thanks a lot
but I have a problem with it because
when I want to preview my blog in step 4, it asked me username and password!
What's wrong?
  </div>
</div>

<div class="comment">
  <div class="comment-header">
    <strong>Syamzone</strong> <span class="comment-date">January 16, 2010 at 04:06 PM</span>
  </div>
  <div class="comment-body">
    Worked Perfect! Thank you!
  </div>
</div>

<div class="comment">
  <div class="comment-header">
    <strong>مصطفى</strong> <span class="comment-date">July 22, 2010 at 01:32 AM</span>
  </div>
  <div class="comment-body">
    I am having this problem
I need to highlight this php 
"echo $data."<br>"; "
but I can't get the "<br>" to show :(
  </div>
</div>

<div class="comment">
  <div class="comment-header">
    <strong>Matthew V Ball</strong> <span class="comment-date">September 20, 2010 at 04:28 AM</span>
  </div>
  <div class="comment-body">
    suresh dasari:  I poked around a bit, but couldn't find an obvious way to get scroll bars working for large snippets of code.  This may not be possible with recent browsers when using SyntaxHighlighter version 1.5.  Just recently, Alex G released version 3.0, so it might be time to upgrade.
  </div>
</div>

<div class="comment">
  <div class="comment-header">
    <strong>Administrador</strong> <span class="comment-date">October 14, 2010 at 10:05 PM</span>
  </div>
  <div class="comment-body">
    great....you help me, i did all things you said...thanks....!!gretting from peru..!!
  </div>
</div>

<div class="comment">
  <div class="comment-header">
    <strong>Nripendra nath newa</strong> <span class="comment-date">February 12, 2011 at 07:48 PM</span>
  </div>
  <div class="comment-body">
    Hey, thanks. It was a real time saver.
  </div>
</div>

<div class="comment">
  <div class="comment-header">
    <strong>Anonymous</strong> <span class="comment-date">April 11, 2011 at 04:52 PM</span>
  </div>
  <div class="comment-body">
    great (:
thank u very much
  </div>
</div>

<div class="comment">
  <div class="comment-header">
    <strong>darthpotato</strong> <span class="comment-date">December 07, 2011 at 05:22 PM</span>
  </div>
  <div class="comment-body">
    Works here on one of the newest blogger templates, but I can't do right or left angle brackets. They get converted to the escaped HTML, whether or not I convert them beforehand with an encoder like this one: http://www.accessify.com/tools-and-wizards/developer-tools/quick-escape/default.php. Strange.

Tried to upgrade syntaxhighlighter, but the latest versions don't wrap long lines, so they won't work with my template.
  </div>
</div>

<div class="comment">
  <div class="comment-header">
    <strong>Dinesh Varyani</strong> <span class="comment-date">April 13, 2012 at 06:55 PM</span>
  </div>
  <div class="comment-body">
    Thanks matt .... I tried it on my blog <a href="http://www.hubberspot.com" rel="nofollow">http://www.hubberspot.com</a> and it worked really well ..... keep the good work up ....
  </div>
</div>

<div class="comment">
  <div class="comment-header">
    <strong>SONGCHAI SAETERN</strong> <span class="comment-date">February 05, 2013 at 04:26 AM</span>
  </div>
  <div class="comment-body">
    Thanks a lot :)
  </div>
</div>

<div class="comment">
  <div class="comment-header">
    <strong>Scripter Zone</strong> <span class="comment-date">October 17, 2013 at 06:25 AM</span>
  </div>
  <div class="comment-body">
    how do you make "view plain" link?? 


  </div>
</div>

<div class="comment">
  <div class="comment-header">
    <strong>Anonymous</strong> <span class="comment-date">November 05, 2013 at 08:39 AM</span>
  </div>
  <div class="comment-body">
    Is there any way to change the font and font size ?
  </div>
</div>
</div>
