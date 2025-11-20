---
title: "Fixing up the Mac Key Bindings for Windows Users"
date: 2008-04-26 14:44:00 +0000
categories:
  - Programming
  - Mac
blogger_orig_url: /2008/04/fixing-up-mac-key-bindings-for-windows.html
---

[Note: Edited on 2010-02 to switch the order of the shift and command key modifiers.  Apparently, Mac OS is particular about the order.]<br />
<br />
[Edited on 2010-10-22 to describe how to use TextEdit to apply this key mapping]<br />
[Edited on 2010-11-12 to mention that TextEdit sometimes adds a .txt extension] <br />
<br />
<br />
I'm a longtime Windows user who recently purchased a Macbook.  Overall I'm very impressed with the machine, but it does have a learning curve, especially for the key bindings.<br />
<div><br />
</div><div>The first thing I noticed was that the Macbook does not have the Del and Ins keys at all, and the Home, End, PageUp and PageDown keys require pressing 'Fn' and then an Arrow key (which is understandable because the keyboard on a small Macbook is somewhat cramped -- also, I've asked a couple users who have not used PCs much before using a Mac, and they did not even know these keys existed, or what they would do with them)</div><div><br />
</div><div>However, when I'm not on the road, I like to use a nice full sized Microsoft Natural Keyboard, to reduce tendinitis.  As a (former) hard-core programmer, I very extensively use the Home, End, PageUp and PageDown keys to quickly navigate code or text documents.  I was very dismayed to discover that Apple pretty much doesn't do anything with these keys.</div><div><br />
</div><div>In hunting through all the configuration options, I noticed that you can reconfigure a lot of key mappings through the System Preferences utility (go to the apple in the upper-left corner, select System Preferences..., click on Keyboard & Mouse, and click the Keyboard Shortcuts tab).  This was useful for a start, but I quickly determined that the Mac wouldn't allow me to bind keys to any of the 6 special keys (Home, End, PageUp, PageDown, Delete, Insert).  This made me sad.</div><div><br />
</div><div>I did discover, however, that it is possible to switch the Control and Command keys.  This is a big help because now all the windows favorites like Ctrl+c for copy, Ctrl+v for paste, Ctrl+x for cut, and Ctrl+z for undo now work the same on both systems.  I still switch frequently between Windows and Mac platforms, so it's very nice to have the same key mappings.</div><div><br />
</div><div>Most recently, I discovered that there is a special file you can create that allows special mappings to the 6 special keys.  This made me happy.  I was now able to get much closer to having a unified key mapping.  For more details, see <a href="http://www.lsmason.com/articles/macosxkeybindings.html">this article</a>.</div><div><br />
</div><div>To do this, create a new file called <code>~/Library/KeyBindings/DefaultKeyBinding.dict</code> and put the following text into it  (You'll probably have to create the directory the first time -- this is okay).</div><div><br />
<br />
<pre class="c" name="code">/* ~/Library/KeyBindings/DefaultKeyBinding.Dict
This file remaps the key bindings of a single user on Mac OS X 10.5 to more closely
match default behavior on Windows systems.  This particular mapping assumes
that you have also switched the Control and Command keys already.

This key mapping is more appropriate after switching Ctrl for Command in this menu:
Apple->System Preferences->Keyboard & Mouse->Keyboard->Modifier Keys...->
Change Control Key to Command
Change Command key to Control
This applies to OS X 10.5 and possibly other versions.

Here is a rough cheatsheet for syntax.
Key Modifiers
^ : Ctrl
$ : Shift
~ : Option (Alt)
@ : Command (Apple)
# : Numeric Keypad

Non-Printable Key Codes

Up Arrow:     \UF700        Backspace:    \U0008        F1:           \UF704
Down Arrow:   \UF701        Tab:          \U0009        F2:           \UF705
Left Arrow:   \UF702        Escape:       \U001B        F3:           \UF706
Right Arrow:  \UF703        Enter:        \U000A        ...
Insert:       \UF727        Page Up:      \UF72C
Delete:       \UF728        Page Down:    \UF72D
Home:         \UF729        Print Screen: \UF72E
End:          \UF72B        Scroll Lock:  \UF72F
Break:        \UF732        Pause:        \UF730
SysReq:       \UF731        Menu:         \UF735
Help:         \UF746

NOTE: typically the Windows 'Insert' key is mapped to what Macs call 'Help'.  
Regular Mac keyboards don't even have the Insert key, but provide 'Fn' instead, 
which is completely different.
*/

{
"\UF729"   = "moveToBeginningOfLine:";                       /* Home         */
"@\UF729"  = "moveToBeginningOfDocument:";                   /* Cmd  + Home  */
"$\UF729"  = "moveToBeginningOfLineAndModifySelection:";     /* Shift + Home */
"@$\UF729" = "moveToBeginningOfDocumentAndModifySelection:"; /* Shift + Cmd  + Home */
"\UF72B"   = "moveToEndOfLine:";                             /* End          */
"@\UF72B"  = "moveToEndOfDocument:";                         /* Cmd  + End   */
"$\UF72B"  = "moveToEndOfLineAndModifySelection:";           /* Shift + End  */
"@$\UF72B" = "moveToEndOfDocumentAndModifySelection:";       /* Shift + Cmd  + End */
"\UF72C"   = "pageUp:";                                      /* PageUp       */
"\UF72D"   = "pageDown:";                                    /* PageDown     */
"$\UF728"  = "cut:";                                         /* Shift + Del  */
"$\UF727"  = "paste:";                                       /* Shift + Ins */
"@\UF727"  = "copy:";                                        /* Cmd  + Ins  */
"$\UF746"  = "paste:";                                       /* Shift + Help */
"@\UF746"  = "copy:";                                        /* Cmd  + Help (Ins) */
"@\UF702"  = "moveWordBackward:";                            /* Cmd  + LeftArrow */
"@\UF703"  = "moveWordForward:";                             /* Cmd  + RightArrow */
"@$\UF702" = "moveWordBackwardAndModifySelection:";   /* Shift + Cmd  + Leftarrow */
"@$\UF703" = "moveWordForwardAndModifySelection:";   /* Shift + Cmd  + Rightarrow */
}</pre><div>Remember: These key mappings assume that you've switched Control and Command.  If you don't want to make this switch, replace each @ (command) with ^ (control).</div><div><br />
Here are steps to take to apply these changes:<br />
<ul><li>Open TextEdit under the Applications folder.  If TextEdit was already open, create a new document using File->New.  There should be a window labeled 'Untitled'.</li>
<li>Select the text within the window above, copy it, and then paste it into your new TextEdit window.</li>
<li>In TextEdit, convert this to plain text (the default is rich text) by selecting Format->Make Plain Text.</li>
<li>Next, select File->Save As...  In the "Save As" dialog box, navigate to your home directory (look under PLACES on the left side for a house picture that has your name next to it).  In your home directory, double-click on the Library folder.  If you see a KeyBindings folder then double-click on it.  If not, then click on "New Folder" (within the Library directory), name the new folder KeyBindings (with no space), and then double-click on it.  Type <code>DefaultKeyBinding.dict</code> for the filename (at the top) and then click Save.</li>
<li>Warning:  TextEdit will sometimes try to 'help' you by appending a .txt extension to the filename.  Make sure this doesn't happen.  If asked to use a .txt extension, tell TextEdit to instead use .dict.  It will not work if you use .txt.  If you have trouble, see comment by Nathan below.</li>
<li>Before these changes take effect, you need to log out and then log back in.</li>
</ul><br />
</div><div>There you have it!  I know this emulation isn't perfect (not all applications honor this mapping), but it's a good start.  Please drop comments if you have any questions or suggestions for improvements.</div></div>

---

## Comments

<div class="archived-comments">

<div class="comment">
  <div class="comment-header">
    <strong>Anonymous</strong> <span class="comment-date">July 11, 2008 at 03:24 PM</span>
  </div>
  <div class="comment-body">
    Thanks much!  I've been looking for something like this.
  </div>
</div>

<div class="comment">
  <div class="comment-header">
    <strong>Aaron H</strong> <span class="comment-date">January 05, 2009 at 02:00 PM</span>
  </div>
  <div class="comment-body">
    Thanks for this post!  They all seem to work for me on Leopard 10.5.6, except for one. I am having trouble making Shift-Insert work for paste.   Strangely, Shift-Delete works for cut just fine.  Any ideas?
  </div>
</div>

<div class="comment">
  <div class="comment-header">
    <strong>Anonymous</strong> <span class="comment-date">February 17, 2010 at 02:19 PM</span>
  </div>
  <div class="comment-body">
    Cool, so in addition to swapping $ and @, I have another binding suggestion for you. Many times I've hit delete to backspace by word which is the windows behaviour. On mac, it deletes the whole line! So, here's another binding to try:

"@\U007F" = "deleteWordBackward:"; // cmd + delete left

Kevin G
  </div>
</div>

<div class="comment">
  <div class="comment-header">
    <strong>Anonymous</strong> <span class="comment-date">February 17, 2010 at 07:00 PM</span>
  </div>
  <div class="comment-body">
    Oops, I had a typo in my previous comment, I intended to write that on Windows backspace that deletes by word. -- Kevin G
  </div>
</div>

<div class="comment">
  <div class="comment-header">
    <strong>Noah</strong> <span class="comment-date">June 21, 2010 at 09:30 PM</span>
  </div>
  <div class="comment-body">
    Awesome, thanks for this info!
I'd like to switch my control and command keys like you mentioned but then I can't quite get used to pressing ctrl+tab to switch applications.  Do you know if it's possible to change that shortcut?
  </div>
</div>

<div class="comment">
  <div class="comment-header">
    <strong>Matthew V Ball</strong> <span class="comment-date">June 22, 2010 at 01:05 PM</span>
  </div>
  <div class="comment-body">
    Noah: I haven't found a way to change ctrl+tab to alt+tab for switching windows, so I've been having to re-learn that aspect of the windowing system.  I would be interested if anyone else finds a way to change this... :)
  </div>
</div>

<div class="comment">
  <div class="comment-header">
    <strong>Unknown</strong> <span class="comment-date">October 22, 2010 at 03:48 PM</span>
  </div>
  <div class="comment-body">
    Thanks for posting here I have switched the Control and Command keys, what is the next step (where I have to past your code..?). Please explain me once. I am not familiar with programming. If it’s works for me it would great help for me…
  </div>
</div>

<div class="comment">
  <div class="comment-header">
    <strong>Anonymous</strong> <span class="comment-date">March 13, 2012 at 10:36 AM</span>
  </div>
  <div class="comment-body">
    I couldn't even do it with as simple as "b" = ("insertText:", "a");
logged out, restarted, nada.
  </div>
</div>
</div>
