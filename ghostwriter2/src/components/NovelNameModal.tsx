import React, { useState, useEffect } from 'react';
import './NovelNameModal.css';

interface NovelNameModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (name: string) => void;
}

const NovelNameModal: React.FC<NovelNameModalProps> = ({ isOpen, onClose, onConfirm }) => {
  const [novelName, setNovelName] = useState('');

  useEffect(() => {
    if (isOpen) {
      setNovelName('');
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = novelName.trim();
    if (trimmedName) {
      onConfirm(trimmedName);
      onClose();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Create New Novel</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        
        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label htmlFor="novel-name">Novel Name</label>
            <input
              id="novel-name"
              type="text"
              value={novelName}
              onChange={(e) => setNovelName(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter your novel's title..."
              autoFocus
              maxLength={100}
            />
          </div>
          
          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={!novelName.trim()}>
              Create Novel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NovelNameModal;