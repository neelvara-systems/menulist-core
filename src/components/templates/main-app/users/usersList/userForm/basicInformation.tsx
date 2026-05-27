import FormElementWrapper from '@atoms/formElementWrapper';
import PhoneNumberInput from '@atoms/phoneNumberInput';
import EditorWrapper from '@organisms/editor/editorWrapper';
import { Alert, Input, Switch, Typography } from 'antd';
const { Text } = Typography;

function BasicInformation({ userDetails, onChangeValue }) {
    const isEditing = Boolean(userDetails?.id);
    const staffLoginId = userDetails?.staffLoginId || userDetails?.loginUsername || '';
    const isOwnerPasscodeLogin = userDetails?.staffAuthMode === 'owner_passcode';
    const emailValue = isOwnerPasscodeLogin ? '' : userDetails?.displayEmail || userDetails?.email || '';

    return (
        <EditorWrapper gap={20}>
            <Alert
                message={isEditing ? 'Update staff access details for this store.' : 'Create staff with an email invite, or leave email blank to create a Staff ID and passcode.'}
                showIcon
                type="info"
            />

            {isEditing && <FormElementWrapper label="Active">
                <Switch size="small"
                    defaultChecked={userDetails?.active || false}
                    value={userDetails?.active || false}
                    onChange={(checked) => onChangeValue('active', checked)}
                />
            </FormElementWrapper>}

            <FormElementWrapper label="Name" mandatory>
                <Input placeholder="Staff member name" value={userDetails?.name || ""} onChange={(e) => onChangeValue('name', e.target.value)} />
            </FormElementWrapper>

            <FormElementWrapper label='Email'>
                <Input
                    disabled={isEditing}
                    type='email'
                    placeholder="Email, if staff has one"
                    value={emailValue}
                    onChange={(e) => onChangeValue('email', e.target.value)}
                />
                <Text type="secondary">
                    {isEditing ? 'Email cannot be changed here.' : 'Leave blank to create a Staff ID and passcode.'}
                </Text>
            </FormElementWrapper>

            {staffLoginId && <FormElementWrapper label='Staff ID'>
                <Input disabled value={staffLoginId} />
            </FormElementWrapper>}

            <FormElementWrapper label='Phone Number'>
                <PhoneNumberInput
                    countryCode={userDetails?.countryCode || ''}
                    phoneNumber={userDetails?.phoneNumber || ''}
                    dialCode={userDetails?.dialCode || ''}
                    onChange={(data) => onChangeValue('phoneNumber', data)}
                />
            </FormElementWrapper>

            <FormElementWrapper label='Alternate Number'>
                <PhoneNumberInput
                    countryCode={userDetails?.alternatePhoneNumber?.countryCode || ''}
                    phoneNumber={userDetails?.alternatePhoneNumber?.phoneNumber || ''}
                    dialCode={userDetails?.alternatePhoneNumber?.dialCode || ''}
                    onChange={(data) => onChangeValue('alternatePhoneNumber', data)}
                />
            </FormElementWrapper>

        </EditorWrapper>
    )
}

export default BasicInformation
