import { Button } from '@/components/ui/button'
import { Check, Loader2 } from 'lucide-react'

interface CheckoutButtonProps {
  totalAmount: number
  onCheckout: () => void
  disabled: boolean
  isSubmitting: boolean
}

export function CheckoutButton({ totalAmount, onCheckout, disabled, isSubmitting }: CheckoutButtonProps) {
  return (
    <div className="sticky bottom-6 mt-6">
      <Button 
        className="w-full h-16 text-lg font-bold shadow-xl rounded-2xl bg-green-600 hover:bg-green-700 text-white disabled:opacity-50 transition-all"
        onClick={onCheckout}
        disabled={disabled || isSubmitting}
      >
        {isSubmitting ? (
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
        ) : (
          <Check className="w-6 h-6 mr-2" />
        )}
        ENCAISSER {totalAmount} DH
      </Button>
    </div>
  )
}
