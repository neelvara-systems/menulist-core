import { Flex, InputNumber, Select } from 'antd';
import { CountryCode, isValidPhoneNumber, parsePhoneNumberWithError } from 'libphonenumber-js';
import React, { useEffect } from 'react';
import { LuPhoneCall } from 'react-icons/lu';
import countryData from './countryData';

interface PhoneNumberInputProps {
    countryCode: string;
    phoneNumber: string;
    dialCode: string;
    onChange?: (value: { countryCode: string; phoneNumber: string, dialCode: string }) => void;
}

const PhoneNumberInput: React.FC<PhoneNumberInputProps> = ({ countryCode, phoneNumber, dialCode, onChange }) => {

    const validatePhoneNumber = (number: string, country: string) => {
        try {
            if (!number) return true;
            const isValid = isValidPhoneNumber(number, country as CountryCode);
            return isValid;
        } catch (error) {
            return false;
        }
    };

    const formatPhoneNumber = (number: string, country: string) => {
        try {
            if (!number) return number;
            // Remove all non-digit characters for consistent formatting
            const digitsOnly = number.replace(/\D/g, '');
            const phoneNumber = parsePhoneNumberWithError(digitsOnly, country as CountryCode);
            return phoneNumber?.formatNational() || digitsOnly;
        } catch (error) {
            return number;
        }
    };

    const handleCountryChange = (country: string) => {
        // Reformat the existing number for the new country
        onChange?.({
            countryCode: country,
            phoneNumber: formatPhoneNumber(phoneNumber, country),
            dialCode: countryData.find(c => c.code == country)?.dialCode || ''
        });
    };

    const handlePhoneNumberChange = (newNumber: any) => {
        onChange?.({
            countryCode,
            phoneNumber: formatPhoneNumber(newNumber, countryCode),
            dialCode: countryData.find(c => c.code == countryCode)?.dialCode || ''
        });
    };

    useEffect(() => {
        if (phoneNumber) {
            onChange?.({
                countryCode,
                phoneNumber: formatPhoneNumber(phoneNumber || '', countryCode),
                dialCode: countryData.find(c => c.code == countryCode)?.dialCode || ''
            });
        }
    }, [phoneNumber, countryCode]);

    return (
        <Flex gap={8} style={{ width: '100%' }}>
            <Select
                placeholder="Country Code"
                showSearch
                style={{ width: 150 }}
                value={countryCode || ''}
                onChange={handleCountryChange}
                options={countryData.map(country => ({
                    value: country.code,
                    label: `${country.flag} ${country.code} (${country.dialCode})`
                }))}
            />
            <InputNumber
                controls={false}
                prefix={<LuPhoneCall />}
                value={phoneNumber}
                onChange={(e) => handlePhoneNumberChange(e)}
                placeholder={dialCode ? `(${dialCode})` : ''}
                style={{ width: '100%' }}
            />
        </Flex>
    );
};

export default PhoneNumberInput;