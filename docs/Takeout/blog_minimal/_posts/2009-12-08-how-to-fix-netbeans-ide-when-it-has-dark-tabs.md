---
title: "How to fix NetBeans IDE when it has dark tabs"
date: 2009-12-08 18:29:00 +0000
categories:
  - Programming
  - NetBeans
blogger_orig_url: /2009/12/how-to-fix-netbeans-ide-when-it-has.html
---

Sometimes on Windows, you can have Java configured in such a way that the <a href="http://netbeans.org/">NetBeans IDE</a> (Integrated Development Environment) will use a dark background (like black) on all the inactive tabs, making them difficult (or impossible) to read.  Here's an example of what this might look like:<br />
<br />
<div class="separator" style="clear: both; text-align: center;"><a href="https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEgmUvhKtCcWGrcp8mIOBwFYYIJ-NCr7bpmDqJb0peUgJAD8GAaJc7jZasU5gW9Jgp2Bmsv8bHpn7bJghQJSyKYAv3QAizG2FGPHAb0ws8UkEweAVMLFcfNLExEW32r5bkVMqnen0fQbKQg/s1600-h/NetBeansWithDarkTabBackground.PNG" imageanchor="1" style="margin-left: 1em; margin-right: 1em;"><img border="0" src="https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEgmUvhKtCcWGrcp8mIOBwFYYIJ-NCr7bpmDqJb0peUgJAD8GAaJc7jZasU5gW9Jgp2Bmsv8bHpn7bJghQJSyKYAv3QAizG2FGPHAb0ws8UkEweAVMLFcfNLExEW32r5bkVMqnen0fQbKQg/s400/NetBeansWithDarkTabBackground.PNG" /></a><br />
</div><br />
<div class="separator" style="clear: both; text-align: center;"><br />
</div>Not good.<br />
<br />
As it turns out, there is no way in NetBeans itself to fix this problem, at least that I've found.  You can't change the color scheme or anything.<br />
<br />
A work-around for this problem is to change the Java theme for NetBeans IDE to be something else, like Metallic.<br />
<br />
To change the theme, open the file "c:\Program Files\NetBeans x.x\etc\netbeans.conf" (where x.x is the version number) with a text editor and add this to the end of the <code>netbeans_default_options</code> line, before the closing quote:<br />
<br />
<code>--laf javax.swing.plaf.metal.MetalLookAndFeel</code>"<br />
<br />
Here's what NetBeans might look like after making this change:<br />
<br />
<div class="separator" style="clear: both; text-align: center;"><a href="https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEhJQU-vsgcIblRWljs-KQcU0SK4fgcisABnXdLRI83wmyNO0v_dTMypZ9OsyCPJb3XBwAnR6AtlAMp4V2-vzETuzIf0tRyrCxSJVBT0UWBMvW3Wj75CsBNdoLVhtPhyphenhyphenEIwDBwkIQ3sCAPU/s1600-h/NetBeansWithLightTabBackground.PNG" imageanchor="1" style="margin-left: 1em; margin-right: 1em;"><img border="0" src="https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEhJQU-vsgcIblRWljs-KQcU0SK4fgcisABnXdLRI83wmyNO0v_dTMypZ9OsyCPJb3XBwAnR6AtlAMp4V2-vzETuzIf0tRyrCxSJVBT0UWBMvW3Wj75CsBNdoLVhtPhyphenhyphenEIwDBwkIQ3sCAPU/s400/NetBeansWithLightTabBackground.PNG" /></a><br />
</div><br />
<div class="separator" style="clear: both; text-align: center;"><br />
</div><br />
You can now read the tabs!<br />
<br />
Hat tip to Tushar Joshi for a description of <a href="http://netbeanside61.blogspot.com/2008/05/netbeans-ide-look-and-feel.html">changing the look-and-feel of NetBeans</a>.