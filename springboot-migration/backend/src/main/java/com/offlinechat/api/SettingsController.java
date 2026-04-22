package com.offlinechat.api;

import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/settings")
public class SettingsController {
    private final SettingsService settingsService;

    public SettingsController(SettingsService settingsService) {
        this.settingsService = settingsService;
    }

    @GetMapping
    public Map<String, String> getSettings() {
        return settingsService.getSettings();
    }

    @PutMapping("/{key}")
    public void updateSetting(@PathVariable String key, @RequestBody Map<String, String> payload) {
        settingsService.updateSetting(key, payload.get("value"));
    }
}
