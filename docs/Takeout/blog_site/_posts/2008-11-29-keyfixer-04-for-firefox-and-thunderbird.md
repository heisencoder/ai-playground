---
title: "Keyfixer 0.4 for Firefox and Thunderbird"
date: 2008-11-29 02:46:00 +0000
categories:
  - Programming
  - Mac
blogger_orig_url: /2008/11/keyfixer-04-for-firefox-and-thunderbird.html
---

<div>Firefox/Thunderbird <a href="http://mavaball.net/wiki/index.php/Keyfixer">keyfixer</a>, starting with version 0.4, is now as a <a href="https://addons.mozilla.org/en-US/firefox/addon/9796">Mozilla Extension</a>.</div><div><br /></div><div>Keyfixer makes the keyboard bindings for Firefox or Thunderbird on Mac OS X behave like Windows.  This is very useful for people who use both Windows and Mac (like I do), and don't want to have to continually remap your brain for each system</div><div><br /></div><div>This new version is a regular Mozilla Extension (a type of Add-on), so now you don't have to uninstall and reinstall every time you upgrade Firefox.</div><div><br /></div><div>Thanks to Jim Mendenhall of <a href="http://www.starryhope.com/">Starry Hope</a> for the original version!</div><div><br /></div><div>Let me know if you have any issues!</div><div><br /></div><div>Cheers, -Matt<br /><br />[Update: <a href="http://mavaball.net/files/keyfixer_0-4-2.xpi">Version 0.4.2</a> is now available as a feature release to additionally bind the Control key instead of just the Command key. Some people prefer to use Control, and now you can use either...)<br /></div>

---

## Comments

<div class="archived-comments">

<div class="comment">
  <div class="comment-header">
    <strong>Matthew V Ball</strong> <span class="comment-date">November 29, 2008 at 09:45 PM</span>
  </div>
  <div class="comment-body">
    Hi Jan,<BR/><BR/>I made it use "Cmd" instead of "Ctrl" because I have Cmd and Ctrl switched so that all the other applications behave more like Windows.  If I used "Ctrl" in this extension, it would actually mess me up.<BR/><BR/>To switch "Cmd" and "Ctrl", use the apple menu as follows:<BR/><BR/>Apple Icon->System Preferences...->Keyboard & Mouse->Keyboard->Modifier Keys...<BR/><BR/>Then change the Control (^) Key to use "Command", and the Command Key to use "^ Control".<BR/><BR/>That said, if you still prefer keeping all your other applications more "Mac-like", you could probably directly replace the platformHTMLBindings.xml file directly with one taken from a Windows Firefox of the same version.  This is a fairly quick hack, and if there's enough demand, I could look into adding a "Preferences..." Menu to keyfixer that would let you choose which version to use...<BR/><BR/>Cheers, -Matt
  </div>
</div>

<div class="comment">
  <div class="comment-header">
    <strong>Jan</strong> <span class="comment-date">December 03, 2008 at 12:05 AM</span>
  </div>
  <div class="comment-body">
    Thanks! It works for me, although I had to manually install the update from your site; it didn't update through the mozilla add-on mechanism.
  </div>
</div>

<div class="comment">
  <div class="comment-header">
    <strong>Matthew V Ball</strong> <span class="comment-date">December 03, 2008 at 12:32 PM</span>
  </div>
  <div class="comment-body">
    Thank you Jan for giving it a spin!  I'll investigate the updating issue, although I suspect it didn't update because keyfixer is currently not public on Mozilla's site.  This is my first Extension, so it's quite possible that I need to do something special to enable automatic updates. (Anyone know?)
  </div>
</div>

<div class="comment">
  <div class="comment-header">
    <strong>Nico</strong> <span class="comment-date">December 03, 2008 at 08:00 PM</span>
  </div>
  <div class="comment-body">
    Using this program since 0.2, I am really happy it's now an extension !<BR/>No more resintalling "keyfixer" with every Firefox version.<BR/>Thank a lot Matthew, I was so lost without theses 2 keys...
  </div>
</div>

<div class="comment">
  <div class="comment-header">
    <strong>Anonymous</strong> <span class="comment-date">December 31, 2008 at 04:56 AM</span>
  </div>
  <div class="comment-body">
    Works Great! Thanks for the hard work. I just switched from windows to osx and little things like this drove me nuts.
  </div>
</div>

<div class="comment">
  <div class="comment-header">
    <strong>Anonymous</strong> <span class="comment-date">January 08, 2009 at 04:59 PM</span>
  </div>
  <div class="comment-body">
    Thanks for your work on this, very helpful!<BR/><BR/>Greg
  </div>
</div>

<div class="comment">
  <div class="comment-header">
    <strong>Olly</strong> <span class="comment-date">January 29, 2009 at 11:18 AM</span>
  </div>
  <div class="comment-body">
    A preferences dialog would be most welcome.  I'd like to be able to switch the behaviour of Ctrl-Left/Right to Alt-Left/Right since Spaces on Leopard already uses Ctrl-Left/Right
  </div>
</div>

<div class="comment">
  <div class="comment-header">
    <strong>Matthew V Ball</strong> <span class="comment-date">January 29, 2009 at 12:45 PM</span>
  </div>
  <div class="comment-body">
    Olly: I've got Spaces disabled on my system, but I do remember running into some issues previously... :)<BR/><BR/>Unfortunately, a configuration menu would be a large change -- I'd have to learn a whole lot more about extension programming.  I wouldn't mind doing some of this for a "1.0" release, but as you'd expect, my time is somewhat limited.<BR/><BR/>BTW, I think that Cmd-Left/Right should do what you want, in this case.
  </div>
</div>

<div class="comment">
  <div class="comment-header">
    <strong>Unknown</strong> <span class="comment-date">February 05, 2009 at 09:24 PM</span>
  </div>
  <div class="comment-body">
    Just a quick thank you note.  I've been annoyed by Firefox's behavior on the mac since day one and it took me a long time to work out which problems were mac inconsistencies (of which there were more than I expected) and which one were Firefox oddities.  Between your excellent post at http://heisencoder.net/2008/04/fixing-up-mac-key-bindings-for-windows.html and this, I'm a very happy camper.<BR/><BR/>Thank you for all of this work, it's really appreciated.
  </div>
</div>

<div class="comment">
  <div class="comment-header">
    <strong>Stableboy</strong> <span class="comment-date">February 17, 2009 at 05:57 PM</span>
  </div>
  <div class="comment-body">
    Thanks, I shudder to think how much time I've spent trying to get the HOME/END keys fixed on FF for Mac!  Finally! :)
  </div>
</div>

<div class="comment">
  <div class="comment-header">
    <strong>Matthew V Ball</strong> <span class="comment-date">March 09, 2009 at 03:12 PM</span>
  </div>
  <div class="comment-body">
    Hi ambientnoise,<BR/><BR/>I've added some rough instructions here: <A HREF="http://mavaball.net/wiki/index.php/Keyfixer#Hacking_Keyfixer" REL="nofollow"> Hacking Keyfixer</A><BR/><BR/>Basically, platformHTMLBindings.xml is stored within a zip within a zip. (i.e., the .jar file within the .xpi file).<BR/><BR/>Let me know if these instructions give you the basics...
  </div>
</div>

<div class="comment">
  <div class="comment-header">
    <strong>Anonymous</strong> <span class="comment-date">March 16, 2009 at 07:58 AM</span>
  </div>
  <div class="comment-body">
    Hello, thank you for creating this add-on..<BR/><BR/>Are you working on the 3.1b3 version of this add-on?
  </div>
</div>

<div class="comment">
  <div class="comment-header">
    <strong>Anonymous</strong> <span class="comment-date">March 20, 2009 at 09:34 PM</span>
  </div>
  <div class="comment-body">
    Thanks a lot! You're clever even Steve Jobs:)
  </div>
</div>

<div class="comment">
  <div class="comment-header">
    <strong>Ed</strong> <span class="comment-date">March 27, 2009 at 05:50 AM</span>
  </div>
  <div class="comment-body">
    Thanks for the plugin!
  </div>
</div>

<div class="comment">
  <div class="comment-header">
    <strong>Arjan</strong> <span class="comment-date">March 28, 2009 at 02:40 PM</span>
  </div>
  <div class="comment-body">
    Does this also fix problems when hitting Cmd-Left while typing text in some richt-text editors? In some editors (such as TinyMCE) hitting Cmd-Left to go to the start of the current line makes Firefox go back to the previous page instead. If keyfixer does not prevent that, then an add-on named keyconfig might be helpful -- see http://www.macosxhints.com/article.php?story=20090118145518767
  </div>
</div>

<div class="comment">
  <div class="comment-header">
    <strong>Anonymous</strong> <span class="comment-date">June 13, 2009 at 06:08 AM</span>
  </div>
  <div class="comment-body">
    i have installed it & it works great for firefox, but has not worked for thunderbird at all

is there something i;m not doing?

cheers

glen
  </div>
</div>

<div class="comment">
  <div class="comment-header">
    <strong>Anonymous</strong> <span class="comment-date">June 16, 2009 at 03:32 AM</span>
  </div>
  <div class="comment-body">
    hi matt

 i thought when i added keyfixer from the official firefox add on site that it would also add it to thunderbird

but i have just realised that the add on was not actually installed on thunderbird
so i now have installed keyfixer directly from thunderbird and it is working fine

thanks

glen
  </div>
</div>

<div class="comment">
  <div class="comment-header">
    <strong>Anonymous</strong> <span class="comment-date">July 22, 2009 at 10:16 PM</span>
  </div>
  <div class="comment-body">
    command back does not work on google docs for me even with this installed. i have a unibody with firefox 3.5 installed
  </div>
</div>

<div class="comment">
  <div class="comment-header">
    <strong>Anonymous</strong> <span class="comment-date">July 31, 2009 at 11:12 AM</span>
  </div>
  <div class="comment-body">
    This fixes the BIGGEST single annoyance I've had since changing to a Macbook. I use GMail all day as my primary email, and bad behavior with the Home and End keys was maddening. 

THANK you for this.
  </div>
</div>

<div class="comment">
  <div class="comment-header">
    <strong>Anonymous</strong> <span class="comment-date">August 28, 2009 at 04:16 PM</span>
  </div>
  <div class="comment-body">
    Oh crap, I never knew why my fix OUTSIDE firefox didn't work inside gmail.  Now I have home and end.  Thank you SO MUCH!!!
  </div>
</div>

<div class="comment">
  <div class="comment-header">
    <strong>Anonymous</strong> <span class="comment-date">September 01, 2009 at 11:10 PM</span>
  </div>
  <div class="comment-body">
    This is a blessing!
  </div>
</div>

<div class="comment">
  <div class="comment-header">
    <strong>Anonymous</strong> <span class="comment-date">October 19, 2009 at 04:30 PM</span>
  </div>
  <div class="comment-body">
    Hey, I'm using FF v3.5.3, and OS X SL v10.6.1 on a new MBP 15".  I just installed keyfixer v0.4.2, and it's not working in the compose windows of gmail.

Admittedly, I also have KeyRemap4MacBook installed to get the same behavior outside of FF.  Would that break keyfixer behavior?
  </div>
</div>

<div class="comment">
  <div class="comment-header">
    <strong>Matthew V Ball</strong> <span class="comment-date">October 19, 2009 at 04:40 PM</span>
  </div>
  <div class="comment-body">
    id: 

Note that there is a known issue with Firefox and GMail compose (in Rich text editing mode), concerning the Cmd-Left/Cmd-Right mappings.  GMail seems to snarf this up, probably through JavaScript.  Maybe this is part of the problem?

I've never seen KeyRemap4MacBook before, so I don't know the strategy it uses for doing the key remapping.  The Keyfixer 0.1 strategy is to change the Cocoa default key bindings, and this method does not interfere with the Firefox KeyFixer 0.4.x because Firefox doesn't seem to use the Cocoa key bindings.  If KeyRemap4MacBook uses a more general remapping, then it's quite possible that it interferes with Firefox KeyFixer.  

Anyone else have thoughts?
  </div>
</div>

<div class="comment">
  <div class="comment-header">
    <strong>Matthew V Ball</strong> <span class="comment-date">May 06, 2011 at 08:58 PM</span>
  </div>
  <div class="comment-body">
    DJ:  Cmd-Left is very troublesome because this causes the browser to go to the previous page if a text box (or similar widget) doesn't have the input focus.  I've gotten around this problem by installing the keyconfig extension (see http://mozilla.dorando.at/) and mapping Alt-Left instead of Cmd-Left for going to the previous page.  I don't know an easy way to change KeyFixer to do this without a major revamp.
  </div>
</div>

<div class="comment">
  <div class="comment-header">
    <strong>Robin</strong> <span class="comment-date">July 06, 2011 at 04:40 PM</span>
  </div>
  <div class="comment-body">
    Is there an  update in the works that will be usable in Thunderbird 5?
  </div>
</div>

<div class="comment">
  <div class="comment-header">
    <strong>Matthew V Ball</strong> <span class="comment-date">July 06, 2011 at 11:27 PM</span>
  </div>
  <div class="comment-body">
    Robin: I haven't been planning to upgrade keyfixer for Thunderbird 5 since I don't use Thunderbird anymore.  However, I could take a look.  Is there a particular problem that you're running in to?
  </div>
</div>

<div class="comment">
  <div class="comment-header">
    <strong>Matthew V Ball</strong> <span class="comment-date">July 07, 2011 at 12:34 AM</span>
  </div>
  <div class="comment-body">
    Okay, I did some quick checking, and it looks like Keyfixer 0.5 will work as-is in Thunderbird 5.  I've updated the allowed versions on the Mozilla extensions page, so next time you search for extension updates, Keyfixer 0.5 should work again in Thunderbird 5 beta.
  </div>
</div>
</div>
