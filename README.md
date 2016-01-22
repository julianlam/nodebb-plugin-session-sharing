# Session Sharing for NodeBB

In a nutshell, this plugin allows you to share sessions between your application and NodeBB. You'll need to set a
special cookie with a common domain, containing a JSON Web Token with user data. If sufficient, this plugin will
handle the rest (user registration/login).

## How is this related to SSO?

Single Sign-On allows a user to log into NodeBB through a third-party service. It is best (and most securely)
achieved via OAuth2 provider, although other alternatives exist. An example of a single sign-on plugin is
[nodebb-plugin-sso-facebook](https://github.com/julianlam/nodebb-plugin-sso-facebook).

Single sign-on *does not* allow a session to become automatically created if a login is made to another site.
This is the one misconception that people hold when thinking about SSO and session sharing.

This session sharing plugin will allow NodeBB to automatically log in users (and optionally, log out users)
if the requisite shared cookie is found (more on that below).

You can use this plugin and single sign-on plugins together, but they won't be seamlessly integrated.

## How does this work?

This plugin checks incoming requests for a **shared cookie** that is saved by your application when a user
logs in. This cookie contains in its value, a specially crafted signed token containing unique identifying
information for that user.

If the user can be found in NodeBB, that user will be logged in. If not, then a user is created, and that
unique indentifier is saved for future reference.

## How can I integrate my site with this plugin?

When a user logs in, you'll need to save a cookie in their browser session for NodeBB. This cookie needs
to have a couple special attributes:

* The `HttpOnly` flag should be set for security, otherwise the shared cookie can be read by via AJAX/XHR
* The `domain` should be set to the naked domain. That is, if your site is at `app.example.com`, and your
forum is at `talk.example.com`, the cookie domain should be set to `example.com`.
* The cookie name is up to you, and can be configured in this plugin's settings. *(Default: `token`)*
* The cookie value is a [JSON Web Token](https://jwt.io/). See below.

### Generating the JSON Web Token

A list of compatible libraries can be obtained on the main website for [JSON Web Tokens](https://jwt.io/).

You'll be encoding a payload that looks something like this:

``` json
{
	"id": 123,
	"username": "foobar"
}
```

You are required to pass in at least `id` and `username`.

You can also add `email`, `firstName`, `lastName`, `picture` to the payload if you'd like. If you specify
`firstName` or `lastName`, `username` is no longer required. These values don't have to match exactly,
you can customise the property names in the plugin settings.

Encode the payload with a secret of your choice, and configure the plugin by specifying the secret, so
it can properly decode and verify the JWT signature.

**Note**: In some libraries, the payload is encoded like so:

``` json
{
	"d": {
		"email": "bob@example.com",
		"uid": "123",
		"username": "cheddar"
	},
	"exp": 1454710044,
	"iat": 1452118044
}
```

In which case, you can set the "Parent Key" setting in this plugin to `d`.

## Testing

If you need to generate a fake token for testing, you can `GET /debug/session` while NodeBB is in development
mode. NodeBB will then log in or create a user called "testUser", with the email "testUser@example.org".