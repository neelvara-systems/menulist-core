# PhoneNumberInput Component Documentation

## Overview
The PhoneNumberInput component is a reusable React component that provides international phone number input and validation functionality. It combines a country selector with a phone number input field and uses the `libphonenumber-js` library for validation and formatting.

## Features
- Country selection with flags and dial codes
- Real-time phone number validation
- Country-specific format validation
- Visual error feedback
- Fully controlled component
- Automatic national formatting based on country selection

## Installation
Install the required dependency:
```bash
npm install libphonenumber-js
```

## Usage
```tsx
import PhoneNumberInput from '@atoms/phoneNumberInput';

// Basic usage
<PhoneNumberInput
  value={{
    countryCode: 'US',
    phoneNumber: '1234567890'
  }}
  onChange={({ countryCode, phoneNumber, isValid }) => {
    // Handle the changes
    console.log(countryCode, phoneNumber, isValid);
  }}
/>

// With error state
<PhoneNumberInput
  value={{
    countryCode: 'US',
    phoneNumber: '1234567890'
  }}
  onChange={handleChange}
  error={true}
/>
```

## Props
| Prop | Type | Required | Description |
|------|------|----------|-------------|
| value | `{ countryCode: string; phoneNumber: string }` | No | The current value of the input |
| onChange | `(value: { countryCode: string; phoneNumber: string; isValid: boolean }) => void` | No | Callback function called when either country or number changes |
| error | boolean | No | External error state to show error styling |

## Component Structure
The component consists of three main files:

1. `index.tsx` - Main component implementation
2. `countryData.ts` - Country data with codes, names, and flags
3. `doc.md` - This documentation file

### Core Functions

#### 1. validatePhoneNumber
Validates a phone number for a specific country using `isValidPhoneNumber` from libphonenumber-js.
```typescript
const validatePhoneNumber = (number: string, country: string) => {
    try {
        if (!number) return true;
        return isValidPhoneNumber(number, country as CountryCode);
    } catch (error) {
        return false;
    }
};
```

#### 2. formatPhoneNumber
Formats a phone number according to the national format of the selected country using `parsePhoneNumberWithError`.
```typescript
const formatPhoneNumber = (number: string, country: string) => {
    try {
        if (!number) return number;
        const digitsOnly = number.replace(/\D/g, '');
        const phoneNumber = parsePhoneNumberWithError(digitsOnly, country as CountryCode);
        return phoneNumber?.formatNational() || digitsOnly;
    } catch (error) {
        return number;
    }
};
```

### Features Explained

#### 1. Country Selection
- Dropdown with country flags and dial codes
- 20+ commonly used countries included
- Visual feedback with country flags
- Easy to extend with more countries

#### 2. Phone Number Validation
- Real-time validation using libphonenumber-js
- Format validation specific to each country
- Visual error feedback when number is invalid
- Validation status provided through onChange callback

#### 3. User Experience
- Combined country code and phone number input
- Automatic formatting of phone numbers as user types
- Error states for invalid numbers
- Fully controlled component that works with form state

## Example Implementation
```tsx
const MyForm = () => {
  const [phoneData, setPhoneData] = useState({
    countryCode: 'US',
    phoneNumber: ''
  });

  const handlePhoneChange = ({ countryCode, phoneNumber, isValid }) => {
    setPhoneData({ countryCode, phoneNumber });
    // Handle validation state if needed
  };

  return (
    <PhoneNumberInput
      value={phoneData}
      onChange={handlePhoneChange}
    />
  );
};
```

## Supported Countries
The component includes 20 commonly used countries by default:
- United States (+1)
- United Kingdom (+44)
- India (+91)
- Canada (+1)
- Australia (+61)
- Germany (+49)
- France (+33)
- Italy (+39)
- Spain (+34)
- Brazil (+55)
- Japan (+81)
- South Korea (+82)
- China (+86)
- Russia (+7)
- Mexico (+52)
- Singapore (+65)
- United Arab Emirates (+971)
- Saudi Arabia (+966)
- South Africa (+27)
- New Zealand (+64)

To add more countries, edit the `countryData.ts` file following the existing format:
```typescript
{
  code: 'US',    // ISO country code
  name: 'United States',
  dialCode: '+1',
  flag: '🇺🇸'    // Country flag emoji
}
```

## Best Practices
1. Always handle the validation state in your form validation logic
2. Use the error prop to show external validation errors
3. Consider adding form-level validation before submission
4. Use the isValid parameter from onChange to show immediate feedback to users
5. Handle empty or invalid phone numbers appropriately in your form submission logic

## Dependencies
- React
- Ant Design (antd) for UI components
- libphonenumber-js for phone number validation and formatting
- react-icons for icons

## Browser Support
The component uses modern JavaScript features and relies on the following:
- ES6+ features
- React 16.8+ (for hooks)
- Modern browser support for emoji display (for country flags)

## Accessibility
- The component uses semantic HTML elements
- Supports keyboard navigation
- Provides visual feedback for errors
- Uses ARIA labels where appropriate
