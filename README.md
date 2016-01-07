# Session Sharing for NodeBB

In a nutshell, this plugin allows you to share sessions between your application and NodeBB. You'll need to set a
special cookie with a common domain, containing a JSON Web Token with user data. If sufficient, this plugin will
handle the rest (user registration/login).