import React, { useState, useEffect } from 'react';
import './SettingsModal.css';

interface APIKey {
  id: string;
  name: string;
  provider: string;
  createdAt: string;
  isActive: boolean;
}

interface SettingsData {
  theme: 'light' | 'dark' | 'auto';
  apiKeys: APIKey[];
  activeApiProvider: 'openai' | 'gemini' | 'claude' | 'grok' | null;
}

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const defaultSettings: SettingsData = {
  theme: 'auto',
  apiKeys: [],
  activeApiProvider: null
};

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'general' | 'api'>('general');
  const [settings, setSettings] = useState<SettingsData>(defaultSettings);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyValue, setNewKeyValue] = useState('');
  const [selectedProvider, setSelectedProvider] = useState<'openai' | 'gemini' | 'claude' | 'grok'>('openai');
  const [encryptionAvailable, setEncryptionAvailable] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [keyValidationWarning, setKeyValidationWarning] = useState<string>('');

  // Load settings and check encryption availability
  useEffect(() => {
    if (isOpen) {
      loadSettings();
      checkEncryption();
    }
  }, [isOpen]);

  const checkEncryption = async () => {
    if (window.electronAPI) {
      try {
        const result = await window.electronAPI.checkEncryptionAvailable();
        setEncryptionAvailable(result.available);
      } catch (error) {
        console.error('Error checking encryption availability:', error);
        setEncryptionAvailable(false);
      }
    }
  };

  const loadSettings = async () => {
    setLoading(true);
    try {
      // Load theme from localStorage (non-sensitive)
      const storedTheme = localStorage.getItem('ghostwriter-theme');
      const theme = storedTheme ? JSON.parse(storedTheme) : 'auto';
      
      // Load API keys from secure storage
      let apiKeys: APIKey[] = [];
      if (window.electronAPI) {
        const result = await window.electronAPI.listApiKeys();
        if (result.success && result.keys) {
          apiKeys = result.keys.map((key: any) => ({
            ...key,
            isActive: false // Will set active status based on stored preference
          }));
        }
      }

      // Load active provider preference
      const storedActiveProvider = localStorage.getItem('ghostwriter-active-provider');
      const activeApiProvider = storedActiveProvider ? JSON.parse(storedActiveProvider) : null;

      // Mark the active provider's keys as active
      if (activeApiProvider) {
        apiKeys = apiKeys.map(key => ({
          ...key,
          isActive: key.provider === activeApiProvider
        }));
      }

      setSettings({
        theme,
        apiKeys,
        activeApiProvider
      });
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  // Save non-sensitive settings to localStorage
  const saveTheme = (theme: 'light' | 'dark' | 'auto') => {
    localStorage.setItem('ghostwriter-theme', JSON.stringify(theme));
  };

  const saveActiveProvider = (provider: 'openai' | 'gemini' | 'claude' | 'grok' | null) => {
    localStorage.setItem('ghostwriter-active-provider', JSON.stringify(provider));
  };

  const validateApiKey = (provider: string, keyValue: string): string => {
    const key = keyValue.trim();
    
    // Basic validation - minimum length and no spaces
    if (key.length < 20) {
      return 'API key seems too short (minimum 20 characters expected)';
    }
    
    if (key.includes(' ')) {
      return 'API key should not contain spaces';
    }
    
    // Provider-specific format checks
    switch (provider) {
      case 'openai':
        if (!key.startsWith('sk-')) {
          return 'OpenAI keys typically start with "sk-". This may not be a valid OpenAI key.';
        }
        if (key.length < 40 || key.length > 70) {
          return 'OpenAI keys are typically 40-70 characters long. Please verify this key.';
        }
        break;
        
      case 'gemini':
        if (!key.startsWith('AI')) {
          return 'Google Gemini keys typically start with "AI". This may not be a valid Gemini key.';
        }
        if (key.length < 35 || key.length > 45) {
          return 'Google Gemini keys are typically 35-45 characters long. Please verify this key.';
        }
        break;
        
      case 'claude':
        if (!key.startsWith('sk-ant-')) {
          return 'Anthropic Claude keys typically start with "sk-ant-". This may not be a valid Claude key.';
        }
        if (key.length < 90) {
          return 'Anthropic Claude keys are typically 90+ characters long. Please verify this key.';
        }
        break;
        
      case 'grok':
        if (!key.startsWith('xai-')) {
          return 'Grok keys typically start with "xai-". This may not be a valid Grok key.';
        }
        break;
    }
    
    return ''; // No warnings
  };

  // Validate key when user types or changes provider
  const handleKeyValueChange = (value: string) => {
    setNewKeyValue(value);
    if (value.trim()) {
      const warning = validateApiKey(selectedProvider, value);
      setKeyValidationWarning(warning);
    } else {
      setKeyValidationWarning('');
    }
  };

  const handleProviderChange = (provider: 'openai' | 'gemini' | 'claude' | 'grok') => {
    setSelectedProvider(provider);
    if (newKeyValue.trim()) {
      const warning = validateApiKey(provider, newKeyValue);
      setKeyValidationWarning(warning);
    }
  };

  const handleThemeChange = (theme: 'light' | 'dark' | 'auto') => {
    const newSettings = { ...settings, theme };
    setSettings(newSettings);
    saveTheme(theme);
    
    // Apply theme immediately
    if (theme === 'dark') {
      document.documentElement.classList.add('dark-theme');
      document.documentElement.classList.remove('light-theme');
    } else if (theme === 'light') {
      document.documentElement.classList.add('light-theme');
      document.documentElement.classList.remove('dark-theme');
    } else {
      document.documentElement.classList.remove('dark-theme', 'light-theme');
    }
  };

  const addApiKey = async () => {
    if (!newKeyName.trim() || !newKeyValue.trim()) return;
    if (!encryptionAvailable) {
      alert('Encryption not available on this system. Cannot store API keys securely.');
      return;
    }

    setLoading(true);
    try {
      // Store API key securely
      const result = await window.electronAPI?.storeApiKey(
        selectedProvider, 
        newKeyName.trim(), 
        newKeyValue.trim()
      );

      if (result?.success) {
        // Check if this should be the active provider (before loading new settings)
        const currentProviderKeys = settings.apiKeys.filter(key => key.provider === selectedProvider);
        const shouldSetAsActive = currentProviderKeys.length === 0 && !settings.activeApiProvider;
        
        // Reload settings to show the new key
        await loadSettings();
        
        // Set as active provider if it was the first key for this provider
        if (shouldSetAsActive) {
          setSettings(prev => ({ ...prev, activeApiProvider: selectedProvider }));
          saveActiveProvider(selectedProvider);
        }

        setNewKeyName('');
        setNewKeyValue('');
        setKeyValidationWarning('');
      } else {
        alert(`Failed to store API key: ${result?.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error adding API key:', error);
      alert('Failed to store API key');
    } finally {
      setLoading(false);
    }
  };

  const removeApiKey = async (keyId: string) => {
    setLoading(true);
    try {
      const result = await window.electronAPI?.deleteApiKey(keyId);
      if (result?.success) {
        // Find the key to check if it was from the active provider
        const keyToRemove = settings.apiKeys.find(key => key.id === keyId);
        
        // Reload settings to reflect the deletion
        await loadSettings();
        
        // If removing the last key from active provider, reset active provider
        if (keyToRemove && settings.activeApiProvider === keyToRemove.provider) {
          const remainingKeysForProvider = settings.apiKeys.filter(
            key => key.provider === keyToRemove.provider && key.id !== keyId
          );
          if (remainingKeysForProvider.length === 0) {
            setSettings(prev => ({ ...prev, activeApiProvider: null }));
            saveActiveProvider(null);
          }
        }
      } else {
        alert(`Failed to remove API key: ${result?.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error removing API key:', error);
      alert('Failed to remove API key');
    } finally {
      setLoading(false);
    }
  };

  const setActiveProvider = (provider: 'openai' | 'gemini' | 'claude' | 'grok') => {
    const providerKeys = settings.apiKeys.filter(key => key.provider === provider);
    if (providerKeys.length === 0) return;

    const newSettings = {
      ...settings,
      activeApiProvider: provider,
      apiKeys: settings.apiKeys.map(key => ({
        ...key,
        isActive: key.provider === provider
      }))
    };

    setSettings(newSettings);
    saveActiveProvider(provider);
  };

  const maskApiKey = (key: string) => {
    if (key.length <= 8) return key;
    return key.substring(0, 4) + '•'.repeat(key.length - 8) + key.substring(key.length - 4);
  };

  if (!isOpen) return null;

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-modal" onClick={e => e.stopPropagation()}>
        <div className="settings-header">
          <h2>Settings</h2>
          <button className="settings-close" onClick={onClose}>×</button>
        </div>

        <div className="settings-tabs">
          <button 
            className={`settings-tab ${activeTab === 'general' ? 'active' : ''}`}
            onClick={() => setActiveTab('general')}
          >
            ⚙️ General
          </button>
          <button 
            className={`settings-tab ${activeTab === 'api' ? 'active' : ''}`}
            onClick={() => setActiveTab('api')}
          >
            🔑 API Keys
          </button>
        </div>

        <div className="settings-content">
          {activeTab === 'general' && (
            <div className="settings-section">
              <h3>Appearance</h3>
              <div className="setting-item">
                <label>Theme</label>
                <div className="theme-options">
                  <button
                    className={`theme-option ${settings.theme === 'light' ? 'active' : ''}`}
                    onClick={() => handleThemeChange('light')}
                  >
                    ☀️ Light
                  </button>
                  <button
                    className={`theme-option ${settings.theme === 'dark' ? 'active' : ''}`}
                    onClick={() => handleThemeChange('dark')}
                  >
                    🌙 Dark
                  </button>
                  <button
                    className={`theme-option ${settings.theme === 'auto' ? 'active' : ''}`}
                    onClick={() => handleThemeChange('auto')}
                  >
                    🔄 Auto
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'api' && (
            <div className="settings-section">
              <h3>API Key Management</h3>
              
              <div className="setting-item">
                <label>Active API Provider</label>
                <div className="active-provider">
                  {settings.activeApiProvider ? (
                    <span className="provider-badge active">
                      {settings.activeApiProvider.toUpperCase()}
                    </span>
                  ) : (
                    <span className="provider-badge inactive">No active provider</span>
                  )}
                </div>
              </div>

              <div className="setting-item">
                <label>Add New API Key</label>
                {!encryptionAvailable && (
                  <div style={{ color: '#dc2626', fontSize: '14px', marginBottom: '8px' }}>
                    ⚠️ Secure encryption not available on this system. API keys cannot be stored securely.
                  </div>
                )}
                <div className="add-key-form">
                  <select 
                    value={selectedProvider} 
                    onChange={(e) => handleProviderChange(e.target.value as 'openai' | 'gemini' | 'claude' | 'grok')}
                    className="provider-select"
                  >
                    <option value="openai">OpenAI</option>
                    <option value="gemini">Google Gemini</option>
                    <option value="claude">Anthropic Claude</option>
                    <option value="grok">Grok</option>
                  </select>
                  <input
                    type="text"
                    placeholder="Key name (e.g., 'Personal', 'Work')"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    className="key-name-input"
                  />
                  <input
                    type="password"
                    placeholder="API Key"
                    value={newKeyValue}
                    onChange={(e) => handleKeyValueChange(e.target.value)}
                    className="key-value-input"
                  />
                  <button 
                    onClick={addApiKey}
                    disabled={!newKeyName.trim() || !newKeyValue.trim() || loading || !encryptionAvailable}
                    className="add-key-button"
                  >
                    {loading ? 'Adding...' : 'Add'}
                  </button>
                </div>
                {keyValidationWarning && (
                  <div style={{ 
                    color: '#dc2626', 
                    fontSize: '14px', 
                    marginTop: '8px',
                    padding: '8px',
                    backgroundColor: '#fef2f2',
                    border: '1px solid #fca5a5',
                    borderRadius: '4px'
                  }}>
                    ⚠️ {keyValidationWarning}
                  </div>
                )}
              </div>

              <div className="api-providers">
                {(['openai', 'gemini', 'claude', 'grok'] as const).map(provider => (
                  <div key={provider} className="provider-section">
                    <div className="provider-header">
                      <h4>
                        {provider === 'openai' && '🤖 OpenAI'}
                        {provider === 'gemini' && '💎 Google Gemini'}
                        {provider === 'claude' && '🧠 Anthropic Claude'}
                        {provider === 'grok' && '🚀 Grok'}
                      </h4>
                      {settings.apiKeys.filter(key => key.provider === provider).length > 0 && (
                        <button
                          onClick={() => setActiveProvider(provider)}
                          className={`set-active-button ${settings.activeApiProvider === provider ? 'active' : ''}`}
                          disabled={settings.activeApiProvider === provider || loading}
                        >
                          {settings.activeApiProvider === provider ? 'Active' : 'Set Active'}
                        </button>
                      )}
                    </div>
                    
                    <div className="api-keys-list">
                      {settings.apiKeys.filter(key => key.provider === provider).length === 0 ? (
                        <p className="no-keys">No API keys added</p>
                      ) : (
                        settings.apiKeys.filter(key => key.provider === provider).map(key => (
                          <div key={key.id} className="api-key-item">
                            <div className="key-info">
                              <span className="key-name">{key.name}</span>
                              <span className="key-value">••••••••••••{key.id.slice(-4)}</span>
                            </div>
                            <button
                              onClick={() => removeApiKey(key.id)}
                              className="remove-key-button"
                              title="Remove API key"
                              disabled={loading}
                            >
                              🗑️
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;