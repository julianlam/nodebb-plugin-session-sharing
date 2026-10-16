# Session Sharing for NodeBB

In a nutshell, this plugin allows you to share sessions between your application and NodeBB. You'll need to set a
special cookie with a common domain, containing a JSON Web Token (signed, or encrypted) with user data. If
sufficient, this plugin will handle the rest (user registration/login).

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
logs in. This cookie contains in its value, a specially crafted signed (JWS) or encrypted (JWE) token
containing unique identifying information for that user.

If the user can be found in NodeBB, that user will be logged in. If not, then a user is created, and that
unique indentifier is saved for future reference.

## How can I integrate my site with this plugin?

When a user logs in, you'll need to save a cookie in their browser session for NodeBB. This cookie needs
to have a couple special attributes:

* The `HttpOnly` flag should be set for security, otherwise the shared cookie can be read by via AJAX/XHR
* The `domain` should be set to the naked domain. That is, if your site is at `app.example.com`, and your
forum is at `talk.example.com`, the cookie domain should be set to `example.com`.
* The cookie name is up to you, and can be configured in this plugin's settings. *(Default: `token`)*
* The cookie value is a [JSON Web Token](https://jwt.io/) — signed (JWS) or encrypted (JWE). See below.

### Generating the JSON Web Token

The steps below describe the default **JWS** format; if you've switched the plugin to **JWE**, see
[Token Format (JWS / JWE)](#token-format-jws--jwe) instead.

A list of compatible libraries can be obtained on the main website for [JSON Web Tokens](https://jwt.io/).

You'll be encoding a payload that looks something like this...

``` json
{
	"id": 123,
	"username": "foobar"
}
```

... into this JSON Web Token (using a secret of `secret`)...

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MTIzLCJ1c2VybmFtZSI6ImZvb2JhciJ9.b45U-9GfCZ203-pMAtIgTbTm0PfKRZwpI_cpugtDWVM
```

**Note**: Don't use `secret` as your secret!

You are required to pass in at least `id` and `username`.

You can also add `email`, `firstName`, `lastName`, `picture` to the payload if you'd like. If you specify
`firstName` or `lastName`, `username` is no longer required. These values don't have to match exactly,
you can customise the property names in the plugin settings.

Additionally, if group syncing is enabled, you can specify `groups` and list groups that the user is in.
They will be joined (or left) automatically based on what is found in the payload.

**Continuing on...** Encode the payload with a secret of your choice, and configure the plugin by specifying the secret, so
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

### Token Format (JWS / JWE)

By default the shared cookie is a **JWS** (signed) JWT. The **Token Format** setting in the admin panel
allows switching to **JWE** (encrypted) JWTs, in which case the payload is confidential and only decryptable
with the corresponding key, so its contents are not visible in the cookie.

This setting controls the format of tokens *generated* by NodeBB (the `nbb_token` reverse cookie and the
development debug token). **Incoming cookies are auto-detected by their structure** (a JWS has 3
dot-separated segments, a JWE has 5), so *both* formats are accepted regardless of the setting. This allows
a gradual migration: flip the setting, then switch your application over to issuing JWE cookies at your own
pace — users with cookies in either format will continue to log in throughout the transition.

Tokens are created and verified with [`jose`](https://github.com/panva/jose). When issuing JWE cookies from
your application, use the following parameters:

| Signing method | `alg` | `enc` | Key |
| --- | --- | --- | --- |
| HMAC | `dir` | `A256GCM` | HKDF-derived from your shared secret (see below) |
| RSA | `RSA-OAEP-256` | `A256GCM` | The RSA **public** key |

**HMAC key derivation** — JWE's `dir` key method requires the key to be exactly 32 bytes, so
arbitrary-length shared secrets cannot be used directly. NodeBB derives the JWE key with HKDF-SHA256:

```
HKDF(
	ikm:	<your shared secret>,
	salt:	"nodebb-plugin-session-sharing",
	info:	"A256GCM",
	length:	32
)
```

Your application must perform the same derivation before encrypting. JWS is unaffected — `HS256` signing
uses the raw secret as-is, so existing JWS setups keep working unchanged.

**RSA key direction** — note that JWE inverts the key direction of JWS: your application *encrypts* with the
RSA **public** key, and NodeBB *decrypts* with the RSA **private** key. If you use JWE with the RSA signing
method, make sure the **RSA Private Key** is configured in the admin settings — without it, encrypted cookies
cannot be decrypted (a warning is logged at startup).

The `nbb_token` reverse cookie follows the same Token Format setting. If your application reads the reverse
token, it must be able to decrypt JWE when this setting is enabled.

## Security

Please note that according to the JWT spec, a JWS payload is ***not encrypted***, only *signed*. That is,
the Base64 Url Encoded payload is appended to the header. It can be decoded trivially (as base64 is not meant
to be cryptographically secure), so **do not put any private information in the payload** of a JWS token. The
header and payload themselves are *signed* against the secret, and NodeBB will only allow a JWT through if it
has not been tampered with. That is, NodeBB will only continue with a login if the signature can be
independently generated by the received payload and the secret.

**Mitigating payload exposure with JWE** — if the exposure above is a concern for your setup (for example,
your payload includes an `email` or `groups` you'd rather not be visible in a cookie, or you cannot guarantee
HTTPS end-to-end), switch the **Token Format** setting to JWE (see
[Token Format (JWS / JWE)](#token-format-jws--jwe)). A JWE token *encrypts* the payload — with `A256GCM` in
this plugin — so the identifying information is not visible in the cookie at all, and can only be decrypted by
NodeBB with the corresponding key. Note that JWE protects the payload's *confidentiality*; the token is still
only as trustworthy as the key or secret it was sealed with, and a stolen private key (or shared secret) can
still mint valid tokens — the rest of this section applies to both formats.

Use secure cookies transmitted via HTTPS if at all possible.

## Testing

If you need to generate a fake token for testing, you can `GET /debug/session` while NodeBB is in development
mode. NodeBB will then log in or create a user called "testUser", with the email "testUser@example.org".

**Warning**: If you've configured the plugin to "revalidate" instead of "trust" (normally the default), you
might accidentally lock yourself out of the administrative account as you won't have a proper cookie to
authenticate with. To reset the plugin settings, delete the "settings:session-sharing" hash/document in
your data store. In a pinch, running `./nodebb reset -p nodebb-plugin-session-sharing` will work to disable
the plugin so you can log back in.
