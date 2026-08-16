<template>
    <div>
        <div v-if="maintenance.strategy === 'manual'" class="timeslot">
            {{ $t("Manual") }}
        </div>
        <div v-else-if="maintenance.timeslotList.length > 0">
            <div class="timeslot">
                {{ startDateTime }}
                <span class="to">-</span>
                {{ endDateTime }}
            </div>
            <div class="timeslot">
                UTC{{ maintenance.timezoneOffset }}
                <span v-if="maintenance.timezone !== 'UTC'">{{ maintenance.timezone }}</span>
            </div>
        </div>
    </div>
</template>

<script>
import dayjs from "dayjs";
import { SQL_DATETIME_FORMAT_WITHOUT_SECOND } from "../util.ts";

export default {
    props: {
        maintenance: {
            type: Object,
            required: true,
        },
    },
    computed: {
        startDateTime() {
            return dayjs(this.maintenance.timeslotList[0].startDate)
                .tz(this.maintenance.timezone, true)
                .format(SQL_DATETIME_FORMAT_WITHOUT_SECOND);
        },
        endDateTime() {
            return dayjs(this.maintenance.timeslotList[0].endDate)
                .tz(this.maintenance.timezone, true)
                .format(SQL_DATETIME_FORMAT_WITHOUT_SECOND);
        },
    },
};
</script>

<style lang="scss" scoped>
.timeslot {
    margin-top: 0.375rem;
    display: inline-block;
    font-size: 14px;
    color: var(--color-text-muted);
    background-color: var(--color-surface-subtle);
    border-radius: 999px;
    padding: 0 0.625rem;
    margin-right: 0.375rem;

    .to {
        margin: 0 6px;
    }

}
</style>
