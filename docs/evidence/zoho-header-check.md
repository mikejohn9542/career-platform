# Header check: what the receiving server decided

**Working note**, not a submission. The exercise's results sheet is
[`ex06.md`](ex06.md); this file is the longer read of the header behind item 2 of it.

**Message checked:** `Re: Test 01: inbound`, sent 2026-10-19 at 8:09:07 PM PDT from
`michaelj@michaeljportfolio.me` through the Zoho Mail MCP server.
**Message-Id:** `<1a15748bea6.852fa538818015.5355390537921729259@michaeljportfolio.me>`
**Header source:** the receiving mailbox (LMU, Microsoft 365), View message details.
The message body, the recipient address, and all signature and antispam token values are left out.

## The verdict

| Check | Result | What the receiver matched it against |
| --- | --- | --- |
| SPF | **pass** | `smtp.mailfrom=michaeljportfolio.me`, sending IP `165.173.180.52` |
| DKIM | **pass**, "signature was verified" | `header.d=michaeljportfolio.me`, selector `zmail` |
| DMARC | **pass**, `action=none` | `header.from=michaeljportfolio.me`, policy `p=none sp=none pct=100` |
| compauth | **pass**, `reason=100` | Microsoft's composite check, which folds in the three above |

```
Authentication-Results: mx.microsoft.com 1;
 spf=pass (sender IP is 165.173.180.52) smtp.mailfrom=michaeljportfolio.me;
 dkim=pass (signature was verified) header.d=michaeljportfolio.me;
 dmarc=pass action=none header.from=michaeljportfolio.me;
 compauth=pass reason=100
```

## Each check found its answer somewhere different

This is the part worth noticing. The three checks do not look at the same field:

- **SPF** authorizes a *carrier*. It read the **envelope sender** — `smtp.mailfrom` — took the connecting
  IP `165.173.180.52`, and asked DNS whether `michaeljportfolio.me` permits it. The published record is
  `v=spf1 mx include:zoho.com ~all`, the `include` pulls in Zoho's relay ranges, and `.52` is inside them.
  Microsoft wrote the same conclusion twice, once as `spf=pass` and once as a separate header:

  ```
  Received-SPF: Pass (protection.outlook.com: domain of michaeljportfolio.me
   designates 165.173.180.52 as permitted sender)
   receiver=protection.outlook.com; client-ip=165.173.180.52;
   helo=sender6-of-o52.zoho.com; pr=C
  ```

- **DKIM** proves the *message* was not forged or altered. The message carried a signature naming the
  domain and the selector; Microsoft fetched the public key from `zmail._domainkey.michaeljportfolio.me`
  and verified the signature against it. Zoho holds the private half and never sends it — the same
  public/private split as the TLS certificate from Exercise 04.

  ```
  DKIM-Signature: v=1; a=rsa-sha256; c=relaxed/relaxed; s=zmail;
   d=michaeljportfolio.me; i=michaelj@michaeljportfolio.me   [b= value omitted]
  ```

- **DMARC** decides what to do, and it reads the **`From:` header** — the only one of the three a human
  ever sees. It passes when SPF or DKIM passes *and* the domain that passed matches the From domain.

**Alignment is the whole point.** `smtp.mailfrom`, `header.d`, and `header.from` are all
`michaeljportfolio.me` here — not Zoho's domain. That is what makes DMARC pass. A message can pass SPF
on a sender's own domain while the From header says something else entirely; DMARC is the check that
refuses to let those two come apart, and it is why passing SPF or DKIM alone is not enough.

`p=none` means this pass was not load-bearing: a failure would have been reported, not rejected. The pass
shows the records are right, which is the point of monitoring before tightening to `quarantine`.

## Delivery

```
X-Forefront-Antispam-Report: CIP:165.173.180.52; CTRY:US; SCL:-1;
 H:sender6-of-o52.zoho.com; PTR:sender6-of-o52.zoho.com; CAT:NONE; DIR:INB
```

`SCL:-1` is Microsoft's lowest spam confidence level and `CAT:NONE` means no threat category, which is
why the message reached the Inbox rather than Junk. The forward and reverse DNS of the connecting host
agree (`H:` and `PTR:` are both `sender6-of-o52.zoho.com`), which is one of the things a receiver checks
before trusting a relay at all.

## One thing the header shows that the Sent folder cannot

Zoho recorded `mailDeliveryStatus: success` for this message, but that is only Zoho saying it handed the
message off. Every line above was written by the **receiving** side. The two are different pieces of
evidence, and only the second one answers "did it arrive, and was it believed."
