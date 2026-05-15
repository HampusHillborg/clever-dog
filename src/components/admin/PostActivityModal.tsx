import { useState } from 'react';
import { FaCamera, FaTimes } from 'react-icons/fa';
import { postDogActivity } from '../../lib/customerApi';
import { pickPhoto } from '../../lib/photoPicker';

export default function PostActivityModal({ dogId, dogName, onClose, onPosted }: {
  dogId: string;
  dogName: string;
  onClose: () => void;
  onPosted: () => void;
}) {
  const [body, setBody] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const choosePhoto = async () => {
    const picked = await pickPhoto();
    if (picked) {
      setFile(picked.file);
      setPreview(URL.createObjectURL(picked.file));
    }
  };

  const post = async () => {
    setError('');
    if (!file && !body.trim()) {
      setError('Foto eller text krävs.');
      return;
    }
    setSaving(true);
    try {
      await postDogActivity({ dog_id: dogId, file, body });
      onPosted();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kunde inte spara');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-dark/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center animate-fade-in" onClick={onClose}>
      <div
        className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md shadow-lift animate-slide-in-top max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-100 shrink-0">
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold">Posta uppdatering</p>
            <p className="font-semibold text-base truncate">{dogName}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-gray-100 text-gray-500 flex items-center justify-center shrink-0"
            aria-label="Stäng"
          >
            <FaTimes className="text-sm" />
          </button>
        </div>

        <div className="p-4 space-y-3 overflow-y-auto">
          {preview ? (
            <div className="relative rounded-2xl overflow-hidden bg-gray-100">
              <img src={preview} alt="" className="w-full max-h-72 object-cover" />
              <button
                onClick={() => { setFile(null); setPreview(null); }}
                className="absolute top-2 right-2 w-8 h-8 rounded-full bg-dark/70 text-white flex items-center justify-center"
                aria-label="Ta bort foto"
              >
                <FaTimes className="text-xs" />
              </button>
            </div>
          ) : (
            <button
              onClick={choosePhoto}
              className="w-full py-8 rounded-2xl border-2 border-dashed border-gray-200 text-gray-500 hover:border-primary hover:text-primary hover:bg-orange-50/50 transition-colors flex flex-col items-center gap-2"
            >
              <FaCamera className="text-2xl" />
              <span className="text-sm font-medium">Lägg till foto</span>
              <span className="text-[11px] text-gray-400">JPG, PNG eller WEBP · max 5 MB</span>
            </button>
          )}

          <textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            rows={3}
            placeholder="Skriv en kort uppdatering (frivilligt)…"
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:bg-white focus:border-primary transition-colors resize-none"
          />

          {error && (
            <div className="rounded-xl bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-800">
              {error}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-100 flex gap-2 shrink-0">
          <button
            onClick={onClose}
            disabled={saving}
            className="flex-1 py-2.5 rounded-xl text-gray-700 font-medium hover:bg-gray-100 disabled:opacity-50"
          >
            Avbryt
          </button>
          <button
            onClick={post}
            disabled={saving || (!file && !body.trim())}
            className="flex-1 py-2.5 rounded-xl bg-primary text-white font-semibold hover:bg-orange-600 disabled:opacity-50 active:scale-[0.98] transition-all shadow-card"
          >
            {saving ? 'Sparar…' : 'Posta'}
          </button>
        </div>
      </div>
    </div>
  );
}
