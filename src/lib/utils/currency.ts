// Re-exported from @bengo-hub/shared-ui-lib — centralized so pos-ui/treasury-ui/ordering never
// drift again (this file used to hardcode minimumFractionDigits:2, which is wrong for 0-decimal
// currencies like UGX/RWF/JPY). Kept as a thin re-export rather than rewriting every import site
// across this app to the new package path.
export { formatCurrency, formatCompactCurrency } from '@bengo-hub/shared-ui-lib';
