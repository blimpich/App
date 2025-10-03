/* eslint-disable @typescript-eslint/naming-convention */
import {addDays, addMinutes, format, setHours, setMinutes, subDays, subHours, subMinutes, subSeconds} from 'date-fns';
import {toZonedTime, format as tzFormat} from 'date-fns-tz';
import Onyx from 'react-native-onyx';
import DateUtils from '@libs/DateUtils';
import CONST from '@src/CONST';
import IntlStore from '@src/languages/IntlStore';
import ONYXKEYS from '@src/ONYXKEYS';
import type {SelectedTimezone} from '@src/types/onyx/PersonalDetails';
import waitForBatchedUpdates from '../utils/waitForBatchedUpdates';

jest.mock('@src/libs/Log');

const LOCALE = CONST.LOCALES.EN;
const UTC = 'UTC';
describe('DateUtils', () => {
    beforeAll(() => {
        Onyx.init({
            keys: ONYXKEYS,
            initialKeyStates: {
                [ONYXKEYS.SESSION]: {
                    accountID: 999,
                },
                [ONYXKEYS.PERSONAL_DETAILS_LIST]: {
                    '999': {
                        accountID: 999,
                        timezone: {
                            // UTC is not recognized as a valid timezone but
                            // in these tests we want to use it to avoid issues
                            // because of daylight saving time
                            selected: UTC as SelectedTimezone,
                        },
                    },
                },
            },
        });
        return waitForBatchedUpdates();
    });

    beforeEach(() => {
        IntlStore.load(LOCALE);
        return waitForBatchedUpdates();
    });

    afterEach(() => {
        jest.restoreAllMocks();
        jest.useRealTimers();
        Onyx.clear();
    });

    const datetime = '2022-11-07 00:00:00';
    const timezone = 'America/Los_Angeles';

    it('getZoneAbbreviation should show zone abbreviation from the datetime', () => {
        const zoneAbbreviation = DateUtils.getZoneAbbreviation(datetime, timezone);
        expect(zoneAbbreviation).toBe('GMT-8');
    });

    describe('getDBTime', () => {
        it('should return the date in the format expected by the database', () => {
            const getDBTime = DateUtils.getDBTime();
            expect(getDBTime).toBe(format(new Date(getDBTime), CONST.DATE.FNS_DB_FORMAT_STRING));
        });

        it('should represent the correct date in utc when used with a standard datetime string', () => {
            const timestamp = 'Mon Nov 21 2022 19:04:14 GMT-0800 (Pacific Standard Time)';
            const getDBTime = DateUtils.getDBTime(timestamp);
            expect(getDBTime).toBe('2022-11-22 03:04:14.000');
        });

        it('should represent the correct date in time when used with an ISO string', () => {
            const timestamp = '2022-11-22T03:08:04.326Z';
            const getDBTime = DateUtils.getDBTime(timestamp);
            expect(getDBTime).toBe('2022-11-22 03:08:04.326');
        });

        it('should represent the correct date in time when used with a unix timestamp', () => {
            const timestamp = 1669086850792;
            const getDBTime = DateUtils.getDBTime(timestamp);
            expect(getDBTime).toBe('2022-11-22 03:14:10.792');
        });
    });

    describe('formatWithUTCTimeZone', () => {
        describe('when the date is invalid', () => {
            it('returns an empty string', () => {
                const invalidDateStr = '';

                const formattedDate = DateUtils.formatWithUTCTimeZone(invalidDateStr);

                expect(formattedDate).toEqual('');
            });
        });

        describe('when the date is valid', () => {
            const scenarios = [
                {dateFormat: CONST.DATE.FNS_FORMAT_STRING, expectedResult: '2022-11-07'},
                {dateFormat: CONST.DATE.FNS_TIMEZONE_FORMAT_STRING, expectedResult: '2022-11-07T00:00:00Z'},
                {dateFormat: CONST.DATE.FNS_DB_FORMAT_STRING, expectedResult: '2022-11-07 00:00:00.000'},
            ];

            test.each(scenarios)('returns the date as string with the format "$dateFormat"', ({dateFormat, expectedResult}) => {
                const formattedDate = DateUtils.formatWithUTCTimeZone(datetime, dateFormat);

                expect(formattedDate).toEqual(expectedResult);
            });
        });

        it('returns the correct date when the date with time is used', () => {
            const datetimeStr = '2022-11-07 17:48:00';
            const expectedResult = '2022-11-07';
            expect(DateUtils.formatWithUTCTimeZone(datetimeStr)).toEqual(expectedResult);
        });
    });

    describe('getLastBusinessDayOfMonth', () => {
        const scenarios = [
            {
                // Last business day of May in 2025
                inputDate: new Date(2025, 4),
                expectedResult: 30,
            },
            {
                // Last business day  of February in 2024
                inputDate: new Date(2024, 2),
                expectedResult: 29,
            },
            {
                // Last business day of January in 2024
                inputDate: new Date(2024, 0),
                expectedResult: 31,
            },
            {
                // Last business day of September in 2023
                inputDate: new Date(2023, 8),
                expectedResult: 29,
            },
        ];

        test.each(scenarios)('returns a last business day based on the input date', ({inputDate, expectedResult}) => {
            const lastBusinessDay = DateUtils.getLastBusinessDayOfMonth(inputDate);

            expect(lastBusinessDay).toEqual(expectedResult);
        });
    });

    describe('isCardExpired', () => {
        it('should return true when the card is expired', () => {
            const cardMonth = 1;
            const cardYear = new Date().getFullYear() - 1;
            expect(DateUtils.isCardExpired(cardMonth, cardYear)).toBe(true);
        });

        it('should return false when the card is not expired', () => {
            const cardMonth = 1;
            const cardYear = new Date().getFullYear() + 1;
            expect(DateUtils.isCardExpired(cardMonth, cardYear)).toBe(false);
        });
    });

    describe('isCurrentTimeWithinRange', () => {
        beforeAll(() => {
            jest.useFakeTimers();
        });

        afterAll(() => {
            jest.useRealTimers();
        });

        it('should return true when current time is within the range', () => {
            const currentTime = new Date(datetime);
            jest.setSystemTime(currentTime);

            const startTime = '2022-11-06T10:00:00Z';
            const endTime = '2022-11-07T14:00:00Z';

            expect(DateUtils.isCurrentTimeWithinRange(startTime, endTime)).toBe(true);
        });

        it('should return false when current time is before the range', () => {
            const currentTime = new Date(datetime);
            jest.setSystemTime(currentTime);

            const startTime = '2022-11-07T10:00:00Z';
            const endTime = '2022-11-07T14:00:00Z';

            expect(DateUtils.isCurrentTimeWithinRange(startTime, endTime)).toBe(false);
        });

        it('should return false when current time is after the range', () => {
            const currentTime = new Date(datetime);
            jest.setSystemTime(currentTime);

            const startTime = '2022-11-06T10:00:00Z';
            const endTime = '2022-11-06T14:00:00Z';

            expect(DateUtils.isCurrentTimeWithinRange(startTime, endTime)).toBe(false);
        });
    });
});
