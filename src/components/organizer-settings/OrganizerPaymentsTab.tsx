import { CreditCard, Phone, Shield } from 'lucide-react';

interface OrganizerPaymentsTabProps {
  paymentData: {
    bankName: string;
    accountNumber: string;
    accountName: string;
    mobileMoney: string;
    paymentMethod: string;
  };
  setPaymentData: (d: any) => void;
  handleSavePayment: () => void;
  onClose: () => void;
}

export function OrganizerPaymentsTab({
  paymentData,
  setPaymentData,
  handleSavePayment,
  onClose,
}: OrganizerPaymentsTabProps) {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h4 className="text-gray-900 font-medium mb-4">Payment Method</h4>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setPaymentData({ ...paymentData, paymentMethod: 'bank' })}
            className={`px-4 py-4 rounded-lg border-2 text-sm font-medium ${
              paymentData.paymentMethod === 'bank'
                ? 'border-primary bg-purple-50 text-primary'
                : 'border-gray-200 text-gray-700 hover:border-gray-300'
            }`}
          >
            <CreditCard className="w-5 h-5 mx-auto mb-2" />
            Bank Account
          </button>
          <button
            onClick={() => setPaymentData({ ...paymentData, paymentMethod: 'mobile' })}
            className={`px-4 py-4 rounded-lg border-2 text-sm font-medium ${
              paymentData.paymentMethod === 'mobile'
                ? 'border-primary bg-purple-50 text-primary'
                : 'border-gray-200 text-gray-700 hover:border-gray-300'
            }`}
          >
            <Phone className="w-5 h-5 mx-auto mb-2" />
            Mobile Money
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h4 className="text-gray-900 font-medium mb-6">Payment Details</h4>
        {paymentData.paymentMethod === 'bank' ? (
          <div className="space-y-4">
            <div>
              <label className="block text-gray-700 text-sm font-medium mb-2">Bank Name</label>
              <input
                type="text"
                value={paymentData.bankName}
                onChange={(e) => setPaymentData({ ...paymentData, bankName: e.target.value })}
                className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm"
                placeholder="e.g., CRDB Bank"
              />
            </div>
            <div>
              <label className="block text-gray-700 text-sm font-medium mb-2">Account Number</label>
              <input
                type="text"
                value={paymentData.accountNumber}
                onChange={(e) => setPaymentData({ ...paymentData, accountNumber: e.target.value })}
                className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm"
                placeholder="Your account number"
              />
            </div>
            <div>
              <label className="block text-gray-700 text-sm font-medium mb-2">Account Name</label>
              <input
                type="text"
                value={paymentData.accountName}
                onChange={(e) => setPaymentData({ ...paymentData, accountName: e.target.value })}
                className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm"
                placeholder="Account holder name"
              />
            </div>
          </div>
        ) : (
          <div>
            <label className="block text-gray-700 text-sm font-medium mb-2">Mobile Money Number</label>
            <input
              type="tel"
              value={paymentData.mobileMoney}
              onChange={(e) => setPaymentData({ ...paymentData, mobileMoney: e.target.value })}
              className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm"
              placeholder="+255 XXX XXX XXX"
            />
            <p className="text-gray-500 text-xs mt-2">M-Pesa, Tigo Pesa, Airtel Money</p>
          </div>
        )}
      </div>

      <div className="bg-purple-50 border border-purple-200 rounded-xl p-5">
        <div className="flex gap-3">
          <Shield className="w-5 h-5 text-primary flex-shrink-0" />
          <div>
            <h5 className="text-gray-900 font-medium text-sm mb-1">Secure Payment Processing</h5>
            <p className="text-gray-600 text-sm">Your information is encrypted and stored securely.</p>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <button onClick={onClose} className="px-5 py-2.5 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50">
          Cancel
        </button>
        <button onClick={handleSavePayment} className="px-5 py-2.5 bg-primary text-white text-sm rounded-lg hover:bg-primary-dark">
          Save Payment Info
        </button>
      </div>
    </div>
  );
}
