import { Flex, Input, Select } from 'antd';
import React from 'react';
import { LuPhoneCall } from 'react-icons/lu';
import { DEFAULT_PHONE_COUNTRY_CODE, getDialCodeForCountry, getUniquePhoneCountries, normalizePhoneNumberForStorage } from '@lib/phone/phoneNumber';

interface PhoneNumberInputProps {
    countryCode: string;
    phoneNumber: string;
    dialCode: string;
    countryCodeAriaLabel?: string;
    disabled?: boolean;
    phoneNumberAriaLabel?: string;
    onChange?: (value: { countryCode: string; phoneNumber: string, dialCode: string }) => void;
}

const PhoneNumberInput: React.FC<PhoneNumberInputProps> = ({
    countryCode,
    countryCodeAriaLabel,
    dialCode,
    disabled,
    onChange,
    phoneNumber,
    phoneNumberAriaLabel,
}) => {
    const selectedCountryCode = countryCode || DEFAULT_PHONE_COUNTRY_CODE;
    const selectedDialCode = getDialCodeForCountry(selectedCountryCode, dialCode);

    const handleCountryChange = (country: string) => {
        const nextDialCode = getDialCodeForCountry(country);
        const normalized = normalizePhoneNumberForStorage({
            countryCode: country,
            dialCode: nextDialCode,
            phoneNumber,
        });

        onChange?.({
            countryCode: country,
            phoneNumber: normalized.phoneNumber,
            dialCode: nextDialCode
        });
    };

    const handlePhoneNumberChange = (newNumber: string) => {
        const normalized = normalizePhoneNumberForStorage({
            countryCode: selectedCountryCode,
            dialCode: selectedDialCode,
            phoneNumber: newNumber,
        });

        onChange?.({
            countryCode: normalized.countryCode,
            phoneNumber: normalized.phoneNumber,
            dialCode: normalized.dialCode
        });
    };

    return (
        <Flex gap={8} style={{ width: '100%' }}>
            <Select
                aria-label={countryCodeAriaLabel}
                disabled={disabled}
                placeholder="Country Code"
                showSearch
                style={{ width: 150 }}
                value={selectedCountryCode}
                onChange={handleCountryChange}
                options={getUniquePhoneCountries().map((country) => ({
                    key: country.code,
                    value: country.code,
                    label: `${country.flag} ${country.code} (${country.dialCode})`
                }))}
            />
            <Input
                aria-label={phoneNumberAriaLabel}
                autoComplete="tel"
                disabled={disabled}
                inputMode="tel"
                prefix={<LuPhoneCall />}
                value={phoneNumber}
                onChange={(event) => handlePhoneNumberChange(event.target.value)}
                placeholder={selectedDialCode ? `(${selectedDialCode})` : ''}
                style={{ width: '100%' }}
                type="tel"
            />
        </Flex>
    );
};

export default PhoneNumberInput;
