import { X, Check, Users, Sparkles, Crown, ArrowRight, Smartphone, CreditCard } from 'lucide-react';

interface TicketTier {
  name: string;
  price: string;
  priceNumeric: number;
  available: number;
  features: string[];
  color?: string;
}

interface TierTicketModalProps {
  event: {
    id: number;
    title: string;
    date: string;
    location: string;
    ticketTiers?: TicketTier[];
  };
  step: 'tier' | 'quantity' | 'details' | 'payment' | 'confirm';
  selectedTier: string | null;
  quantity: number;
  formData: { name: string; email: string };
  paymentPhone: string;
  selectedProvider: string;
  isProcessingPayment: boolean;
  onSelectTier: (tier: string) => void;
  onQuantityChange: (quantity: number) => void;
  onFormDataChange: (field: 'name' | 'email', value: string) => void;
  onPaymentPhoneChange: (phone: string) => void;
  onProviderChange: (provider: string) => void;
  onNext: () => void;
  onBack: () => void;
  onClose: () => void;
  onSubmit: () => void;
}

export function TierTicketModal({
  event,
  step,
  selectedTier,
  quantity,
  formData,
  paymentPhone,
  selectedProvider,
  isProcessingPayment,
  onSelectTier,
  onQuantityChange,
  onFormDataChange,
  onPaymentPhoneChange,
  onProviderChange,
  onNext,
  onBack,
  onClose,
  onSubmit,
}: TierTicketModalProps) {
  if (!event.ticketTiers || event.ticketTiers.length === 0) return null;

  const getTierIcon = (tierName: string) => {
    const name = tierName.toLowerCase();
    if (name.includes('vvip')) return <Crown className="w-6 h-6" />;
    if (name.includes('vip')) return <Sparkles className="w-6 h-6" />;
    return <Users className="w-6 h-6" />;
  };

  const getTierColor = (tierName: string) => {
    const name = tierName.toLowerCase();
    if (name.includes('vvip')) return {
      bg: 'bg-gradient-to-br from-yellow-50 to-amber-50',
      border: 'border-yellow-400',
      iconBg: 'bg-gradient-to-br from-yellow-400 to-amber-500',
      text: 'text-yellow-700',
      button: 'bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-600 hover:to-amber-600',
      badge: 'bg-yellow-100 text-yellow-700'
    };
    if (name.includes('vip')) return {
      bg: 'bg-gradient-to-br from-purple-50 to-pink-50',
      border: 'border-purple-400',
      iconBg: 'bg-[#8A2BE2]',
      text: 'text-purple-700',
      button: 'bg-[#8A2BE2] hover:bg-purple-700',
      badge: 'bg-purple-100 text-purple-700'
    };
    return {
      bg: 'bg-gradient-to-br from-gray-50 to-slate-50',
      border: 'border-gray-300',
      iconBg: 'bg-gray-600',
      text: 'text-gray-700',
      button: 'bg-gray-600 hover:bg-gray-700',
      badge: 'bg-gray-100 text-gray-700'
    };
  };

  const selectedTierData = selectedTier ? event.ticketTiers.find(t => t.name === selectedTier) : null;
  const totalPrice = selectedTierData ? selectedTierData.priceNumeric * quantity : 0;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        
        {/* Step 1: Select Tier */}
        {step === 'tier' && (
          <div>
            {/* Header */}
            <div className="relative px-6 py-6 border-b border-gray-200 bg-purple-50">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-gray-900 text-2xl">Choose Your Experience</h2>
                  <p className="text-gray-600 text-sm mt-1">{event.title}</p>
                </div>
                <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Tier Cards */}
            <div className="p-6 space-y-4">
              {event.ticketTiers.map((tier) => {
                const colors = getTierColor(tier.name);
                const isSelected = selectedTier === tier.name;
                
                return (
                  <div
                    key={tier.name}
                    onClick={() => onSelectTier(tier.name)}
                    className={`relative border-2 rounded-2xl p-6 cursor-pointer transition-all hover:shadow-xl ${
                      isSelected 
                        ? `${colors.border} shadow-lg scale-[1.02]` 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {/* Best Value Badge for VIP */}
                    {tier.name === 'VIP' && (
                      <div className="absolute -top-3 left-6">
                        <span className="bg-[#8A2BE2] text-white text-xs px-3 py-1 rounded-full shadow-md">
                          BEST VALUE
                        </span>
                      </div>
                    )}

                    {/* Most Exclusive Badge for VVIP */}
                    {tier.name === 'VVIP' && (
                      <div className="absolute -top-3 left-6">
                        <span className="bg-gradient-to-r from-yellow-500 to-amber-500 text-white text-xs px-3 py-1 rounded-full shadow-md">
                          MOST EXCLUSIVE
                        </span>
                      </div>
                    )}

                    <div className="flex items-start gap-4">
                      {/* Icon */}
                      <div className={`w-14 h-14 ${colors.iconBg} rounded-2xl flex items-center justify-center flex-shrink-0 shadow-md`}>
                        {getTierIcon(tier.name)}
                        <span className="sr-only text-white">{tier.name}</span>
                      </div>

                      {/* Content */}
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="text-gray-900 text-xl">{tier.name} Ticket</h3>
                            <p className="text-gray-500 text-sm">{tier.available} tickets available</p>
                          </div>
                          <div className="text-right">
                            <p className="text-gray-900 text-2xl">{tier.price}</p>
                            <p className="text-gray-500 text-xs">per person</p>
                          </div>
                        </div>

                        {/* Features */}
                        <div className="space-y-2">
                          {tier.features.map((feature, idx) => (
                            <div key={idx} className="flex items-center gap-2 text-sm text-gray-600">
                              <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                              <span>{feature}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Selected indicator */}
                      {isSelected && (
                        <div className="absolute top-6 right-6">
                          <div className="w-8 h-8 bg-[#8A2BE2] rounded-full flex items-center justify-center shadow-lg">
                            <Check className="w-5 h-5 text-white" />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Continue Button */}
            <div className="px-6 pb-6">
              <button
                onClick={onNext}
                disabled={!selectedTier}
                className={`w-full py-4 rounded-xl text-white flex items-center justify-center gap-2 transition-all ${
                  selectedTier
                    ? 'bg-[#8A2BE2] hover:shadow-xl hover:scale-[1.02] active:scale-95'
                    : 'bg-gray-300 cursor-not-allowed'
                }`}
              >
                <span>Continue</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Select Quantity */}
        {step === 'quantity' && selectedTierData && (
          <div>
            {/* Header */}
            <div className="relative px-6 py-6 border-b border-gray-200 bg-purple-50">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-gray-900 text-2xl">How Many Tickets?</h2>
                  <p className="text-gray-600 text-sm mt-1">{selectedTier} Ticket - {selectedTierData.price}</p>
                </div>
                <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Quantity Selector */}
            <div className="p-8">
              <div className="flex items-center justify-center gap-6 mb-8">
                <button
                  onClick={() => onQuantityChange(Math.max(1, quantity - 1))}
                  className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center text-gray-600 hover:bg-gray-200 transition-colors text-2xl"
                >
                  -
                </button>
                <div className="text-center">
                  <p className="text-6xl text-gray-900">{quantity}</p>
                  <p className="text-gray-500 text-sm mt-2">ticket{quantity > 1 ? 's' : ''}</p>
                </div>
                <button
                  onClick={() => onQuantityChange(Math.min(selectedTierData.available, quantity + 1))}
                  className="w-14 h-14 bg-[#8A2BE2] rounded-full flex items-center justify-center text-white hover:bg-purple-700 transition-colors text-2xl"
                >
                  +
                </button>
              </div>

              {/* Total Price */}
              <div className="bg-purple-50 rounded-xl p-6 mb-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm">Total Amount</p>
                    <p className="text-gray-900 text-3xl mt-1">TSh {totalPrice.toLocaleString()}</p>
                  </div>
                  <div className="text-right text-sm text-gray-500">
                    <p>{quantity} × {selectedTierData.price}</p>
                  </div>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={onBack}
                  className="flex-1 py-4 rounded-xl border-2 border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={onNext}
                  className="flex-1 bg-[#8A2BE2] text-white py-4 rounded-xl hover:shadow-xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  <span>Continue</span>
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Enter Details */}
        {step === 'details' && selectedTierData && (
          <div>
            {/* Header */}
            <div className="relative px-6 py-6 border-b border-gray-200 bg-purple-50">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-gray-900 text-2xl">Your Information</h2>
                  <p className="text-gray-600 text-sm mt-1">We'll send your tickets here</p>
                </div>
                <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Form */}
            <div className="p-6">
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-gray-700 mb-2">Full Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => onFormDataChange('name', e.target.value)}
                    placeholder="John Doe"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 mb-2">Email Address</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => onFormDataChange('email', e.target.value)}
                    placeholder="john@example.com"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all"
                  />
                </div>
              </div>

              {/* Order Summary */}
              <div className="bg-gray-50 rounded-xl p-4 mb-6">
                <h3 className="text-gray-900 mb-3">Order Summary</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-gray-600">
                    <span>{selectedTier} Ticket × {quantity}</span>
                    <span>TSh {totalPrice.toLocaleString()}</span>
                  </div>
                  <div className="pt-2 border-t border-gray-200 flex justify-between text-gray-900">
                    <span>Total</span>
                    <span className="text-lg">TSh {totalPrice.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={onBack}
                  className="flex-1 py-4 rounded-xl border-2 border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={onNext}
                  disabled={!formData.name || !formData.email}
                  className={`flex-1 py-4 rounded-xl text-white flex items-center justify-center gap-2 transition-all ${
                    formData.name && formData.email
                      ? 'bg-[#8A2BE2] hover:shadow-xl hover:scale-[1.02] active:scale-95'
                      : 'bg-gray-300 cursor-not-allowed'
                  }`}
                >
                  <span>Review Order</span>
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Payment */}
        {step === 'payment' && selectedTierData && (
          <div>
            {/* Header */}
            <div className="relative px-6 py-6 border-b border-gray-200 bg-purple-50">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-gray-900 text-2xl">Payment Method</h2>
                  <p className="text-gray-600 text-sm mt-1">Select your preferred payment provider</p>
                </div>
                <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Payment Form */}
            <div className="p-6">
              {/* Provider Selection */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                {['Airtel', 'Tigo', 'Halopesa', 'Mpesa'].map((provider) => (
                  <button
                    key={provider}
                    onClick={() => onProviderChange(provider)}
                    className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                      selectedProvider === provider
                        ? 'border-purple-500 bg-purple-50 text-purple-700'
                        : 'border-gray-200 hover:border-purple-200 text-gray-600'
                    }`}
                  >
                    <CreditCard className={`w-6 h-6 ${selectedProvider === provider ? 'text-purple-600' : 'text-gray-400'}`} />
                    <span className="font-medium">{provider}</span>
                  </button>
                ))}
              </div>

              {/* Phone Input */}
              <div className="mb-6">
                <label className="block text-gray-700 mb-2 font-medium">Mobile Number</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Smartphone className="w-5 h-5 text-gray-400" />
                  </div>
                  <input
                    type="tel"
                    value={paymentPhone}
                    onChange={(e) => onPaymentPhoneChange(e.target.value)}
                    placeholder="2557..."
                    className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all text-lg"
                  />
                </div>
                <p className="text-sm text-gray-500 mt-2">Enter the number registered with {selectedProvider}</p>
              </div>

              {/* Order Summary (Compact) */}
              <div className="bg-gray-50 rounded-xl p-4 mb-6 flex justify-between items-center">
                <span className="text-gray-600">Total to Pay</span>
                <span className="text-gray-900 text-xl font-bold">TSh {totalPrice.toLocaleString()}</span>
              </div>

              {/* Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={onBack}
                  className="flex-1 py-4 rounded-xl border-2 border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={onNext}
                  disabled={!paymentPhone || paymentPhone.length < 10}
                  className={`flex-1 py-4 rounded-xl text-white flex items-center justify-center gap-2 transition-all ${
                    paymentPhone && paymentPhone.length >= 10
                      ? 'bg-[#8A2BE2] hover:shadow-xl hover:scale-[1.02] active:scale-95'
                      : 'bg-gray-300 cursor-not-allowed'
                  }`}
                >
                  <span>Review & Pay</span>
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 5: Confirm */}
        {step === 'confirm' && selectedTierData && (
          <div>
            {/* Header */}
            <div className="relative px-6 py-6 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-pink-50">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-gray-900 text-2xl">Confirm Purchase</h2>
                  <p className="text-gray-600 text-sm mt-1">Review your order details</p>
                </div>
                <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Confirmation Details */}
            <div className="p-6">
              {/* Event Info */}
              <div className="bg-gray-50 rounded-xl p-5 mb-5">
                <h3 className="text-gray-900 mb-3">Event Details</h3>
                <div className="space-y-2 text-sm text-gray-600">
                  <p><strong className="text-gray-900">Event:</strong> {event.title}</p>
                  <p><strong className="text-gray-900">Date:</strong> {event.date}</p>
                  <p><strong className="text-gray-900">Location:</strong> {event.location}</p>
                </div>
              </div>

              {/* Ticket Info */}
              <div className="bg-purple-50 rounded-xl p-5 mb-5">
                <h3 className="text-gray-900 mb-3">Ticket Information</h3>
                <div className="space-y-2 text-sm text-gray-600">
                  <p><strong className="text-gray-900">Ticket Type:</strong> {selectedTier}</p>
                  <p><strong className="text-gray-900">Quantity:</strong> {quantity} ticket{quantity > 1 ? 's' : ''}</p>
                  <p><strong className="text-gray-900">Price per ticket:</strong> {selectedTierData.price}</p>
                </div>
              </div>

              {/* Customer Info */}
              <div className="bg-gray-50 rounded-xl p-5 mb-5">
                <h3 className="text-gray-900 mb-3">Customer Information</h3>
                <div className="space-y-2 text-sm text-gray-600">
                  <p><strong className="text-gray-900">Name:</strong> {formData.name}</p>
                  <p><strong className="text-gray-900">Email:</strong> {formData.email}</p>
                  <p><strong className="text-gray-900">Phone:</strong> {paymentPhone} ({selectedProvider})</p>
                </div>
              </div>

              {/* Total */}
              <div className="bg-gradient-to-r from-purple-100 to-pink-100 rounded-xl p-5 mb-6">
                <div className="flex items-center justify-between">
                  <span className="text-gray-900 text-lg">Total Amount</span>
                  <span className="text-gray-900 text-3xl">TSh {totalPrice.toLocaleString()}</span>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={onBack}
                  disabled={isProcessingPayment}
                  className="flex-1 py-4 rounded-xl border-2 border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Back
                </button>
                <button
                  onClick={onSubmit}
                  disabled={isProcessingPayment}
                  className={`flex-1 bg-[#8A2BE2] text-white py-4 rounded-xl hover:shadow-2xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 ${
                    isProcessingPayment ? 'opacity-75 cursor-not-allowed' : ''
                  }`}
                >
                  {isProcessingPayment ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-5 h-5" />
                      <span>Confirm & Pay</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
