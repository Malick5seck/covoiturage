import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

const ConfirmContext = createContext(null);

const defaultState = {
  open: false,
  title: 'Confirmation',
  message: '',
  confirmLabel: 'Confirmer',
  cancelLabel: 'Annuler',
  danger: false,
};

/**
 * Modale de confirmation (remplace window.confirm).
 * @param {{ title?: string, message: string, confirmLabel?: string, cancelLabel?: string, danger?: boolean }} opts
 * @returns {Promise<boolean>} true si confirmé
 */
export function ConfirmDialogProvider({ children }) {
  const resolverRef = useRef(null);
  const [dialog, setDialog] = useState(defaultState);

  const confirm = useCallback((opts) => {
    return new Promise((resolve) => {
      resolverRef.current = resolve;
      setDialog({
        open: true,
        title: opts.title ?? 'Confirmation',
        message: opts.message ?? '',
        confirmLabel: opts.confirmLabel ?? 'Confirmer',
        cancelLabel: opts.cancelLabel ?? 'Annuler',
        danger: Boolean(opts.danger),
      });
    });
  }, []);

  const finish = useCallback((value) => {
    const r = resolverRef.current;
    resolverRef.current = null;
    setDialog((d) => ({ ...d, open: false }));
    r?.(value);
  }, []);

  useEffect(() => {
    if (!dialog.open) return;
    const onKey = (e) => {
      if (e.key === 'Escape') finish(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dialog.open, finish]);

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {dialog.open && (
        <div
          className="fixed inset-0 z-[10000] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-dialog-title"
          aria-describedby="confirm-dialog-desc"
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
            aria-label="Fermer"
            onClick={() => finish(false)}
          />
          <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl border border-gray-100 p-6">
            <h2 id="confirm-dialog-title" className="text-lg font-black text-gainde-dark pr-2">
              {dialog.title}
            </h2>
            <p id="confirm-dialog-desc" className="mt-3 text-sm text-gray-600 leading-relaxed">
              {dialog.message}
            </p>
            <div className="mt-6 flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
              <button
                type="button"
                onClick={() => finish(false)}
                className="w-full sm:w-auto px-5 py-3 rounded-xl font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition"
              >
                {dialog.cancelLabel}
              </button>
              <button
                type="button"
                onClick={() => finish(true)}
                className={`w-full sm:w-auto px-5 py-3 rounded-xl font-bold text-white transition shadow-lg ${
                  dialog.danger
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-gainde-yellow hover:bg-yellow-600'
                }`}
              >
                {dialog.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    throw new Error('useConfirm doit être utilisé dans ConfirmDialogProvider');
  }
  return ctx.confirm;
}
