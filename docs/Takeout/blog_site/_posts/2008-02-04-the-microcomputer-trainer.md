---
title: "The Microcomputer Trainer"
date: 2008-02-04 04:25:00 +0000
categories:
  - Programming
blogger_orig_url: /2008/02/microcomputer-trainer.html
---

Back when I was 7 years old, I wanted to buy a TRS-80 Color Computer, but my dad wanted to make sure that I was committed to programming before spending the $100 -- so he bought me a Science Fair "Microcomputer Trainer" and wanted me to learn to program that first.  After I attempts to read the book with my second grade (or was it first?) reading level, I finally managed to do a little programming, but I ended up destroying the system by shorting the clock out with my fingers.  My dad was satisfied and bought me the CoCo for Christmas later that year, and I've been programming ever since...<br />
<br />
The <a href="http://www.old-computers.com/museum/computer.asp?c=1053&st=1">microcomputer trainer</a> used a simple 4-bit processor with 16 hexadecimal buttons, 4 control buttons, 7 LEDS, a 7 segment HEX LED, and a speaker.  The CPU was a Texas Instruments TMS1100, which was based on the Speak and Spell's TMS1000.<br />
<br />
I downloaded a copy of the <a href="http://www.polylith.com/~brendan/ClassicComputers/Tandy/uCptrTrainManual1.html">manual here</a>.  The primary goal was to teach machine language programming to a young audience.<br />
<br />
My question is whether it's possible to teach kids machine language in today's world by using a similar device.  If so, what changes would be necessary to keep enough interest to teach a little bit about machine language and pointers?  I think a small instruction set would be appropriate, but how small could you make it and still be Turing complete, and still make it fun to use?<br />
<br />
To get the ideas started, here is the instruction set for the Microcomputer Trainer:<br />
<br />
Main commands:<br />
<ul>
<li>0: KA = "Key into Ar" - If a key is pressed, then set Ar to key value and set flag to 0; else set flag to 1.</li>
<li>1: AO = "A Output" - Displays contents of Ar on HEX LED and sets flag to 1.</li>
<li>2: CH = "exChange" - Exchanges the contents of Ar with Br, exchanges Zr with Yr, and sets flag to 1.</li>
<li>3: CY = "exChange Ar with Yr" - Exchanges the contents of Yr and Ar</li>
<li>4: AM = "Ar to Memory" - Moves contents of Ar to the memory location indicated by following nibble and sets flag to 1.</li>
<li>5: MA = "Memory to Ar" - Moves contents of memory indicated by following nibble into Ar and sets flag to 1.</li>
<li>6: M+ = "Memory +" - Adds contents of memory pointed to by Yr to Ar, stores the result in Ar, and sets flag to 1 if there is a carry.</li>
<li>7: M- = "Memory -" - Subtracts the contents of Ar from the memory location pointed to by Yr and stores the result in Ar.  If an underflow occurs, flag is set to 1.</li>
<li>8: TIA = "Transfer Immediate into Ar" - Moves following nibble into Ar and sets flag to 1.</li>
<li>9: AIA = "Add Immediate into Ar"- Adds following nibble into Ar and sets flag to 1 if there is a carry.</li>
<li>A: TIY = "Transfer Immediate into Yr" - Moves following nibble into Yr and sets flag to 1.</li>
<li>B: AIY = "Add Immediate into Yr" - Adds following nibble into Yr and sets flag to 1 if there is a carry.</li>
<li>C: CIA = "Compare Immediate to Ar" - Sets flag to zero if Ar equals following nibble; else sets flag to 1.</li>
<li>D: CIY = "Compare Immediate to Yr" - Sets flag to zero if Yr equals following nibble; else sets flag to 1.</li>
<li>E: CAL = "Call" - Execute extended command (see below) if flag is set to 1 in previous command; else do nothing.</li>
<li>F: JUMP = "Jump" - If flag is 1, jump to byte address in following 2 nibbles; else do nothing</li>
</ul>
CALL commands (preceded by 'E'):<br />
<ul>
<li>E0: RSTO = "Reset port O" - Turns off the HEX LED.</li>
<li>E1: SETR = "Set LED" - Sets LED according to number indicated by Yr (0-6)</li>
<li>E2: RSTR = "Clear LED" -Clears the LED according to number indicated by Yr (0-6).</li>
<li>E3: <span style="font-style: italic;">Not Used</span></li>
<li>E4: CMPL = "Complement" - Replaces Ar with its ones-complement (i.e. result of F - Ar)</li>
<li>E5: CHNG = "Change registers" - Exchanges Ar, Br, Yr & Zr with Ar', Br', Yr' & Zr'.</li>
<li>E6: SIFT = "Shift" - Shifts the contents of Ar one bit to the right and sets the flag to the opposite of the least significant bit of Ar before shifting.</li>
<li>E7: ENDS = "End Sound" - Emits an 'end' sound</li>
<li>E8: ERRS = "Error" - Emits an 'error' sound</li>
<li>E9: SHTS = "Short Sound" - Emits a 'blip' through the speakers</li>
<li>EA: LONS = "Long Sound' - Emits a long sound through the speakers</li>
<li>EB: SUND = "Sound" - Emits a note according to value in Ar (0 = no sound, 1 = la, 2 = ti, 3 = do, ... E = sol, F = no sound)</li>
<li>EC: TIMR = "Timer" - Pauses for the following number of seconds: seconds = (Ar + 1) / 10</li>
<li>ED: DSPR = "Display on port R" - Displays contents of memory locations E and F in binary on the 7 LEDs.  Memory F contains the right-most 4 LEDs and memory E contains the leftmost 3 LEDs.</li>
<li>EE: DEM- = "Decimal conversion of M- result" - similar to DEM+, but subtracts instead of adds.</li>
<li>EF: DEM+ = "Decimal conversion of M+ result" - Adds together the decimal contents of Ar and the pointed address to give a decimal answer and stores that answer at the pointed address.  If there is a carry, 1 is added to the pointed address less 1.  After the command has been executed, the pointer is left pointer one address below the pointed address (If the number to be added is in 54, the answer is put in 54 and the pointer is reduced by 3.  If there is a carry, one is added to 53)</li>
</ul>


---

## Comments

<div class="archived-comments">

<div class="comment">
  <div class="comment-header">
    <strong>Anonymous</strong> <span class="comment-date">May 21, 2010 at 04:13 AM</span>
  </div>
  <div class="comment-body">
    Hi

How did you get the instruction set off the trainer microprocessor.

I want to do similiar with a Hornby Zero One modelo train controller.
Thanks

charlie{@}tech-j.biz
  </div>
</div>

<div class="comment">
  <div class="comment-header">
    <strong>Matthew V Ball</strong> <span class="comment-date">May 21, 2010 at 07:39 PM</span>
  </div>
  <div class="comment-body">
    To get the instruction set, I copied this information out of the manual that is posted at polylith.com.  See links in the article.  I don't know anything about the Hornby Zero One controller, so you'll have to ask Dr. Google.
  </div>
</div>

<div class="comment">
  <div class="comment-header">
    <strong>foo</strong> <span class="comment-date">October 23, 2012 at 01:35 PM</span>
  </div>
  <div class="comment-body">
    part 2 of 2:

You could of course have even less instructions by dropping a number of the math and logic operations, but that would IMO make it less fun (more painful).  You could drop the stack-based addressing, but again, much less fun (more pain).  You can't drop indirect addressing mode without causing massive pain.  You could drop 'trap' for tiny toy programs without causing too much pain, but as soon as a program starts getting complex having no 'trap' facility will suck.  (Though if you have suitable I/O, you don't necessarily need a trap instruction since you could simply create a routine which uses I/O to indicate an error condition before entering an endless loop and call that instead of invoking 'trap' -- hope you don't need it while debugging that I/O code though.  Alternatively, you could use a "trap routine" with a debugger breakpoint set in it in place of a 'trap' instruction, but then it only works with a debugger attached and properly configured.)

More of the instructions could be synthesized, though it results in poorer instruction encoding density and potentially worse performance.  (E.g., synthesizing unconditional branch from any of the conditional branches is pretty straight forward.  'immediate' addressing mode can be synthesized by having the assembler prefill memory [in the binary image] with constants and then reference those using direct mode.  Similarly 'direct' can be derived from 'indirect', and 'immediate' can therefore be derived from 'indirect'.)  But then, you could also have some silly three-instruction computer that only does load, store and nand, and then synthesize all the rest of the instructions you want, including my proposed set.  But the instruction encoding density would be ridiculously bad (or execution would be super-slow if synthesized as an interpreter) and such games don't seem to fit the spirit of the question.  So I have limited synthesis to where it makes sense (where a real design intended for production might use it because it reduces complexity without impacting performance).

  </div>
</div>
</div>
