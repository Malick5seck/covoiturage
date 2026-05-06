<?php

namespace App\Support;

class PhoneNumber
{
    /**
     * Normalise pour correspondre au stockage (login / inscription).
     */
    public static function normalize(string $input): string
    {
        $s = str_replace(' ', '', trim($input));
        $s = preg_replace('/^\+221/', '', $s) ?? $s;

        return preg_replace('/\D/', '', $s) ?? '';
    }

    /**
     * Format E.164 pour SMS (Sénégal +221).
     */
    public static function toE164(string $storedOrLocal): string
    {
        $digits = self::normalize($storedOrLocal);
        if (str_starts_with($digits, '221') && strlen($digits) > 9) {
            return '+'.$digits;
        }

        return '+221'.$digits;
    }
}
