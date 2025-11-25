---
title: "Hiding Password in Registration E-mail for Joomla"
date: 2008-08-16 16:46:00 +0000
categories:
  - Programming
blogger_orig_url: /2008/08/hiding-password-in-registration-e-mail.html
---

I use Joomla 1.0 for the  <a href="https://siswg.net">IEEE Security in Storage Working Group (SISWG)</a> homepage, and discovered that when new users register, their e-mail addresses are e-mailed to them in clear text before being hashed using MD5 and stored in the database.  Since SISWG is a security group, it's important to provide a little better security than for the usual Joomla user.  Things like sending a plaintext password in e-mail are a no-no.<br /><br />Unfortunately, it looks like Joomla 1.0 does not provide a way to disable having the users' e-mail sent to them if the admin chooses to require registration.  The closest thing is to change "Use New Account Activation:" to "No" in the Global Configuration->Site tab, but then users can register without a valid e-mail address.<br /><br />Fortunately, this is just a one-line change to the appropriate file, which shouldn't be a problem for those who don't mind getting a little dirty.  Here are the edit instructions:<br /><br />Open the file components/com_registration/registration.php and change this line:<br /><br />154:     $pwd                 = $row->password;<br /><br />to<br /><br />154:    $pwd                 = "********";<br /><br /><br />If you're not using version 1.0.12, the line number may be a little different.<br /><br />That should do it!