import type {StackScreenProps} from '@react-navigation/stack';
import React, {useCallback} from 'react';
import {Keyboard} from 'react-native';
import {withOnyx} from 'react-native-onyx';
import type {OnyxEntry} from 'react-native-onyx';
import FormProvider from '@components/Form/FormProvider';
import InputWrapper from '@components/Form/InputWrapper';
import type {FormInputErrors, FormOnyxValues} from '@components/Form/types';
import HeaderWithBackButton from '@components/HeaderWithBackButton';
import ScreenWrapper from '@components/ScreenWrapper';
import TextInput from '@components/TextInput';
import useAutoFocusInput from '@hooks/useAutoFocusInput';
import useLocalize from '@hooks/useLocalize';
import useThemeStyles from '@hooks/useThemeStyles';
import * as ErrorUtils from '@libs/ErrorUtils';
import Navigation from '@libs/Navigation/Navigation';
import * as PolicyUtils from '@libs/PolicyUtils';
import * as ValidationUtils from '@libs/ValidationUtils';
import type {SettingsNavigatorParamList} from '@navigation/types';
import AdminPolicyAccessOrNotFoundWrapper from '@pages/workspace/AdminPolicyAccessOrNotFoundWrapper';
import PaidPolicyAccessOrNotFoundWrapper from '@pages/workspace/PaidPolicyAccessOrNotFoundWrapper';
import * as Policy from '@userActions/Policy';
import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import type SCREENS from '@src/SCREENS';
import INPUT_IDS from '@src/types/form/WorkspaceTagCreateForm';
import type {PolicyTagList} from '@src/types/onyx';

type WorkspaceCreateTagPageOnyxProps = {
    /** All policy tags */
    policyTags: OnyxEntry<PolicyTagList>;
};

type CreateTagPageProps = WorkspaceCreateTagPageOnyxProps & StackScreenProps<SettingsNavigatorParamList, typeof SCREENS.WORKSPACE.TAG_CREATE>;

function CreateTagPage({route, policyTags}: CreateTagPageProps) {
    const styles = useThemeStyles();
    const {translate} = useLocalize();
    const {inputCallbackRef} = useAutoFocusInput();

    const validate = useCallback(
        (values: FormOnyxValues<typeof ONYXKEYS.FORMS.WORKSPACE_TAG_CREATE_FORM>) => {
            const errors: FormInputErrors<typeof ONYXKEYS.FORMS.WORKSPACE_TAG_CREATE_FORM> = {};
            const tagName = values.tagName.trim();
            const {tags} = PolicyUtils.getTagList(policyTags, 0);

            if (!ValidationUtils.isRequiredFulfilled(tagName)) {
                errors.tagName = 'workspace.tags.tagRequiredError';
            } else if (tags?.[tagName]) {
                errors.tagName = 'workspace.tags.existingTagError';
            } else if ([...tagName].length > CONST.TAG_NAME_LIMIT) {
                // Uses the spread syntax to count the number of Unicode code points instead of the number of UTF-16 code units.
                ErrorUtils.addErrorMessage(errors, 'tagName', ['common.error.characterLimitExceedCounter', {length: [...tagName].length, limit: CONST.TAG_NAME_LIMIT}]);
            }

            return errors;
        },
        [policyTags],
    );

    const createTag = useCallback(
        (values: FormOnyxValues<typeof ONYXKEYS.FORMS.WORKSPACE_TAG_CREATE_FORM>) => {
            Policy.createPolicyTag(route.params.policyID, values.tagName.trim());
            Keyboard.dismiss();
            Navigation.goBack();
        },
        [route.params.policyID],
    );

    return (
        <AdminPolicyAccessOrNotFoundWrapper policyID={route.params.policyID}>
            <PaidPolicyAccessOrNotFoundWrapper policyID={route.params.policyID}>
                <ScreenWrapper
                    includeSafeAreaPaddingBottom={false}
                    style={[styles.defaultModalContainer]}
                    testID={CreateTagPage.displayName}
                    shouldEnableMaxHeight
                >
                    <HeaderWithBackButton
                        title={translate('workspace.tags.addTag')}
                        onBackButtonPress={Navigation.goBack}
                    />
                    <FormProvider
                        formID={ONYXKEYS.FORMS.WORKSPACE_TAG_CREATE_FORM}
                        onSubmit={createTag}
                        submitButtonText={translate('common.save')}
                        validate={validate}
                        style={[styles.mh5, styles.flex1]}
                        enabledWhenOffline
                    >
                        <InputWrapper
                            InputComponent={TextInput}
                            maxLength={CONST.TAG_NAME_LIMIT}
                            label={translate('common.name')}
                            accessibilityLabel={translate('common.name')}
                            inputID={INPUT_IDS.TAG_NAME}
                            role={CONST.ROLE.PRESENTATION}
                            ref={inputCallbackRef}
                        />
                    </FormProvider>
                </ScreenWrapper>
            </PaidPolicyAccessOrNotFoundWrapper>
        </AdminPolicyAccessOrNotFoundWrapper>
    );
}

CreateTagPage.displayName = 'CreateTagPage';

export default withOnyx<CreateTagPageProps, WorkspaceCreateTagPageOnyxProps>({
    policyTags: {
        key: ({route}) => `${ONYXKEYS.COLLECTION.POLICY_TAGS}${route?.params?.policyID}`,
    },
})(CreateTagPage);
