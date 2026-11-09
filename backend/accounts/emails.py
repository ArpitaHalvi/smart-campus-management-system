import json
import logging
import urllib.error
import urllib.request

from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string

logger = logging.getLogger(__name__)

RESEND_URL = 'https://api.resend.com/emails'


def _send_via_resend(subject, text, html, to):
    payload = {
        'from': settings.DEFAULT_FROM_EMAIL,
        'to': [to],
        'subject': subject,
        'text': text,
        'html': html,
    }
    request = urllib.request.Request(
        RESEND_URL,
        data=json.dumps(payload).encode('utf-8'),
        method='POST',
        headers={
            'Authorization': f'Bearer {settings.RESEND_API_KEY}',
            'Content-Type': 'application/json',
            # Resend's edge rejects requests without a User-Agent
            'User-Agent': 'smart-campus/1.0',
        },
    )
    with urllib.request.urlopen(request, timeout=10) as response:
        return json.loads(response.read().decode('utf-8'))


def send_email(subject, template, context, to):
    """
    Renders `<template>.txt` and `<template>.html` and sends them.
    Uses Resend when RESEND_API_KEY is set, otherwise Django's mailer
    (the console in development). Never raises: a mail outage must not
    break the request, so failures are logged instead.
    """
    text = render_to_string(f'{template}.txt', context)
    html = render_to_string(f'{template}.html', context)

    try:
        if settings.RESEND_API_KEY:
            _send_via_resend(subject, text, html, to)
        else:
            message = EmailMultiAlternatives(
                subject, text, settings.DEFAULT_FROM_EMAIL, [to]
            )
            message.attach_alternative(html, 'text/html')
            message.send()
        return True
    except urllib.error.HTTPError as exc:
        # Resend explains what is wrong (unverified domain, bad key ...)
        detail = exc.read().decode('utf-8', errors='replace')
        logger.error('Resend rejected the email (%s): %s', exc.code, detail)
    except Exception:
        logger.exception('Could not send "%s" email', subject)
    return False


def send_password_reset_email(user, link):
    return send_email(
        subject='Reset your Smart Campus password',
        template='accounts/email/password_reset',
        context={
            'name': user.first_name or user.username,
            'username': user.username,
            'link': link,
            'minutes': settings.PASSWORD_RESET_TIMEOUT // 60,
        },
        to=user.email,
    )
