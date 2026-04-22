package com.offlinechat.api;

import org.springframework.stereotype.Service;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.lang.management.ManagementFactory;
import java.util.Optional;

@Service
public class SystemStatsService {

    public SystemStats getStats() {
        return new SystemStats(
            getJvmStats(),
            getOllamaStats()
        );
    }

    private ProcessStats getJvmStats() {
        com.sun.management.OperatingSystemMXBean osBean = 
            (com.sun.management.OperatingSystemMXBean) ManagementFactory.getOperatingSystemMXBean();
        
        double cpu = osBean.getProcessCpuLoad() * 100;
        if (cpu < 0) cpu = 0; // -1 if not available

        long totalMemory = Runtime.getRuntime().totalMemory();
        long freeMemory = Runtime.getRuntime().freeMemory();
        long usedMemory = totalMemory - freeMemory;

        return new ProcessStats(
            Math.round(cpu * 10.0) / 10.0,
            usedMemory / (1024 * 1024) // MB
        );
    }

    private ProcessStats getOllamaStats() {
        try {
            // Find Ollama process (macOS version)
            Process process = new ProcessBuilder("ps", "-o", "%cpu,%mem", "-p", getOllamaPid()).start();
            try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()))) {
                reader.readLine(); // skip header
                String line = reader.readLine();
                if (line != null) {
                    String[] parts = line.trim().split("\\s+");
                    if (parts.length >= 2) {
                        double cpu = Double.parseDouble(parts[0]);
                        double memPercent = Double.parseDouble(parts[1]);
                        // Estimation of actual RAM using system total
                        long totalSystemRam = ((com.sun.management.OperatingSystemMXBean) ManagementFactory.getOperatingSystemMXBean())
                            .getTotalMemorySize() / (1024 * 1024);
                        long estimatedMem = Math.round((memPercent / 100.0) * totalSystemRam);
                        
                        return new ProcessStats(cpu, estimatedMem);
                    }
                }
            }
        } catch (Exception e) {
            // Ollama might not be running or pgrep failed
        }
        return new ProcessStats(0.0, 0);
    }

    private String getOllamaPid() throws Exception {
        Process p = new ProcessBuilder("pgrep", "-x", "ollama").start();
        try (BufferedReader r = new BufferedReader(new InputStreamReader(p.getInputStream()))) {
            String line = r.readLine();
            return (line != null) ? line.trim() : "";
        }
    }

    public record SystemStats(ProcessStats backend, ProcessStats ollama) {}
    public record ProcessStats(double cpuPercent, long memoryMb) {}
}
