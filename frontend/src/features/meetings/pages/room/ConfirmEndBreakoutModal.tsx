import React from 'react';
import { AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import BaseModal from '@/components/ui/BaseModal';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
}

const ConfirmEndBreakoutModal: React.FC<Props> = ({ isOpen, onClose, onConfirm, title, message }) => {
  const { t } = useTranslation();
  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      subtitle={message}
      maxWidthClassName="max-w-md"
      containerClassName="bg-[#0f1115] rounded-[2.5rem] border border-white/10 text-white"
      icon={
        <div className="p-3 rounded-2xl bg-rose-500/10 text-rose-500 shadow-lg shrink-0">
          <AlertCircle size={24} />
        </div>
      }
    >
      <div className="p-8 pt-2">
        <div className="flex gap-3 mt-4">
          <button
            onClick={onClose}
            className="flex-1 py-3 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold text-sm transition-all border border-white/5 cursor-pointer"
          >
            {t('common.cancel', 'Hủy bỏ')}
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="flex-1 py-3 px-4 rounded-xl bg-rose-500 hover:bg-rose-400 text-white font-bold text-sm transition-all shadow-lg shadow-rose-500/20 cursor-pointer"
          >
            {t('meeting.status.completed_short', 'Xác nhận kết thúc')}
          </button>
        </div>
      </div>
    </BaseModal>
  );
};

export default ConfirmEndBreakoutModal;
