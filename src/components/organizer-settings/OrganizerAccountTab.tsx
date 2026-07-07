import { toast } from 'sonner';

interface OrganizerAccountTabProps {
  onClose: () => void;
}

export function OrganizerAccountTab({ onClose }: OrganizerAccountTabProps) {
  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center justify-between">
        <div>
          <h5 className="text-gray-900 font-medium text-sm">Change Password</h5>
          <p className="text-gray-500 text-sm mt-0.5">Update your password</p>
        </div>
        <button className="px-4 py-2 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200">
          Update
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center justify-between">
        <div>
          <h5 className="text-gray-900 font-medium text-sm">Two-Factor Authentication</h5>
          <p className="text-gray-500 text-sm mt-0.5">Add extra security</p>
        </div>
        <button className="px-4 py-2 bg-primary text-white text-sm rounded-lg hover:bg-primary-dark">
          Enable
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h5 className="text-gray-900 font-medium text-sm mb-4">Connected Accounts</h5>
        <div className="space-y-2">
          {['Facebook', 'Instagram', 'Twitter'].map((platform) => (
            <div key={platform} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-700 text-sm">{platform}</span>
              <span className="text-gray-400 text-xs">Not connected</span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center justify-between">
        <div>
          <h5 className="text-gray-900 font-medium text-sm">Sign Out</h5>
          <p className="text-gray-500 text-sm mt-0.5">Log out from this device</p>
        </div>
        <button
          onClick={() => {
            toast.success('Logged out successfully');
            onClose();
          }}
          className="px-4 py-2 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200"
        >
          Sign Out
        </button>
      </div>

      <div className="bg-red-50 border border-red-200 rounded-xl p-5 flex items-center justify-between">
        <div>
          <h5 className="text-red-900 font-medium text-sm">Delete Account</h5>
          <p className="text-red-700 text-sm mt-0.5">Permanently delete</p>
        </div>
        <button
          onClick={() => {
            if (confirm('Are you sure? This cannot be undone.')) {
              toast.error('Account deletion initiated');
            }
          }}
          className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700"
        >
          Delete
        </button>
      </div>
    </div>
  );
}
