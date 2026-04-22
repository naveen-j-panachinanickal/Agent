package com.offlinechat.api;

import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

@RestController
@RequestMapping("/api/files")
public class FileUploadController {
    private final FileParsingService fileParsingService;

    public FileUploadController(FileParsingService fileParsingService) {
        this.fileParsingService = fileParsingService;
    }

    @PostMapping("/upload")
    public List<FileParsingService.FileResult> uploadFiles(@RequestParam("files") MultipartFile[] files) throws IOException {
        List<FileParsingService.FileResult> results = new ArrayList<>();
        for (MultipartFile file : files) {
            results.add(fileParsingService.parseFile(file));
        }
        return results;
    }
}
