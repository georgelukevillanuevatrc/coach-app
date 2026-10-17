import { format } from 'date-fns'
import { TZDate } from '@date-fns/tz'

/** Today as yyyy-MM-dd in Asia/Manila. */
export const todayStr = () => format(new TZDate(new Date(), 'Asia/Manila'), 'yyyy-MM-dd')
