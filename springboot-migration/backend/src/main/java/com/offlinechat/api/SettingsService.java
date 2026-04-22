package com.offlinechat.api;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;

import java.io.File;
import java.io.IOException;
import java.util.HashMap;
import java.util.Map;

@Service
public class SettingsService {
    private static final String SETTINGS_FILE = "settings.json";
    private final ObjectMapper objectMapper = new ObjectMapper();
    private Map<String, String> settings = new HashMap<>();

    public SettingsService() {
        loadSettings();
    }

    public Map<String, String> getSettings() {
        return settings;
    }

    public synchronized void updateSetting(String key, String value) {
        settings.put(key, value);
        saveSettings();
    }

    private void loadSettings() {
        File file = new File(SETTINGS_FILE);
        if (file.exists()) {
            try {
                settings = objectMapper.readValue(file, Map.class);
            } catch (IOException e) {
                settings = new HashMap<>();
            }
        } else {
            settings = new HashMap<>();
            settings.put("theme", "light");
            settings.put("model", "llama3.2");
        }
    }

    private void saveSettings() {
        try {
            objectMapper.writeValue(new File(SETTINGS_FILE), settings);
        } catch (IOException e) {
            e.printStackTrace();
        }
    }
}
