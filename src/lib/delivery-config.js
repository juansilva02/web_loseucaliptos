import deliveryConfig from '../../shared/delivery-config.json' with { type: 'json' }

export const deliveryBranches = deliveryConfig.branches
export const deliveryScheduleConfig = {
  timezone: deliveryConfig.timezone,
  windowCalendarDays: deliveryConfig.windowCalendarDays,
  weekdaySlots: deliveryConfig.weekdaySlots,
  saturdaySlots: deliveryConfig.saturdaySlots,
}
export const deliveryFeeByLocality = deliveryConfig.deliveryFees

export function deliveryBranchByKey(key) {
  return deliveryBranches.find((branch) => branch.key === key) || deliveryBranches[0]
}
