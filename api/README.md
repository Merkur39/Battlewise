# Reports from the app

`POST /api/feedback` turns a report sent from Foelore into a public issue on this repository,
labelled `from:app` and with its kind (`data`, `bug` or `idea`), so that it lands in the Inbox of the
board. A wrong-data report on a line of a creature that an open issue from the app is already about
becomes a +1 comment on that issue instead. It writes as a GitHub App installed on this repository
only, with Issues in read and write and nothing else: a personal token would expire one day and
every report would then fail without a word.

## Setting it up

Done once, by the owner of the repository. The private key never goes in the repository, in a chat
or in a ticket: from GitHub straight into Vercel.

### 1. Create the GitHub App

On GitHub, Settings › Developer settings › GitHub Apps › **New GitHub App**
([github.com/settings/apps/new](https://github.com/settings/apps/new)):

- **GitHub App name**: `Foelore reports` (the name must be free on all of GitHub; the issues it
  opens show it as their author, with a `bot` badge).
- **Homepage URL**: `https://foelore.vercel.app`.
- **Webhook**: untick **Active**. The app only writes; it listens to nothing.
- **Permissions › Repository permissions › Issues**: **Read and write**. Leave every other permission
  on No access; Metadata turns to Read-only on its own, GitHub requires it.
- **Where can this GitHub App be installed?**: **Only on this account**.

Then **Create GitHub App**.

### 2. Note its id, make its key

On the page of the app:

- note the **App ID** (a number, at the top under About);
- at the bottom, under Private keys, **Generate a private key**: the browser downloads a `.pem`
  file. It is the only copy; keep it out of the repository.

### 3. Install it on Foelore only

Still on the page of the app, **Install App** in the menu on the left, then **Install** next to your
account, **Only select repositories**, pick **Foelore**, **Install**.

GitHub then shows the installation's settings, at an address like
`https://github.com/settings/installations/12345678`: the number at the end is the **installation
id**; note it.

### 4. Give them to Vercel

In Vercel, the `foelore` project, Settings › **Environment Variables**, add three variables:

| Name                         | Value                                                             |
| ---------------------------- | ----------------------------------------------------------------- |
| `GITHUB_APP_ID`              | the App ID                                                        |
| `GITHUB_APP_INSTALLATION_ID` | the installation id                                               |
| `GITHUB_APP_PRIVATE_KEY`     | the whole content of the `.pem`, its first and last line included |

- Environments: **Production**. Add **Preview** too only to try reports from a pull request's
  preview: they open real, public issues, to close afterwards.
- Tick **Sensitive** for the private key: Vercel then never shows it again, even to you.
- Vercel keeps the line breaks of the key as pasted.

A variable reaches a deployment only when that deployment is built: redeploy (or merge) after adding
them. Then delete the downloaded `.pem`, or keep it in a password manager.

### 5. Limit the rate

In the project's **Firewall**, Configure › **New Rule**. It can be set before `/api/feedback` is
deployed: until then it matches nothing.

- **If**: Request Path _equals_ `/api/feedback`, and Method _equals_ `POST`.
- **Then**: **Rate Limit**, fixed window of **10 minutes**, **5** requests, keyed on the **IP**,
  then **Too Many Requests** (429).

Hobby allows one such rule per project; this is it. Publish the change. A report refused by the
limit stays on the player's device and leaves later on its own.

### Changing the key

Generate a new private key on the page of the app, replace `GITHUB_APP_PRIVATE_KEY` in Vercel,
redeploy, then delete the old key on the page of the app.
