package com.offlinechat.api;

import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.apache.poi.xwpf.usermodel.XWPFParagraph;
import org.apache.poi.xwpf.usermodel.XWPFTable;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.util.Base64;
import java.util.Set;

@Service
public class FileParsingService {
    private static final int MAX_CHARS = 20_000;
    private static final Set<String> IMAGE_EXTENSIONS = Set.of("png", "jpg", "jpeg", "webp", "gif", "bmp", "tif", "tiff");

    public FileResult parseFile(MultipartFile file) throws IOException {
        String filename = file.getOriginalFilename();
        if (filename == null) return new FileResult(filename, "", null);

        String ext = filename.substring(filename.lastIndexOf(".") + 1).toLowerCase();
        
        // Handle images
        if (IMAGE_EXTENSIONS.contains(ext)) {
            String base64 = Base64.getEncoder().encodeToString(file.getBytes());
            return new FileResult(filename, "[Image attached]", base64);
        }

        // Handle documents
        String content;
        try (InputStream is = file.getInputStream()) {
            content = switch (ext) {
                case "pdf" -> extractPdf(file.getBytes());
                case "docx" -> extractDocx(is);
                case "xlsx", "xls" -> extractExcel(is);
                default -> new String(file.getBytes(), java.nio.charset.StandardCharsets.UTF_8);
            };
        } catch (Exception e) {
            content = "[Error parsing file: " + e.getMessage() + "]";
        }

        return new FileResult(filename, truncateText(content), null);
    }

    private String extractPdf(byte[] bytes) throws IOException {
        try (PDDocument document = Loader.loadPDF(bytes)) {
            PDFTextStripper stripper = new PDFTextStripper();
            return stripper.getText(document);
        }
    }

    private String extractDocx(InputStream is) throws IOException {
        try (XWPFDocument doc = new XWPFDocument(is)) {
            StringBuilder sb = new StringBuilder();
            for (XWPFParagraph p : doc.getParagraphs()) {
                sb.append(p.getText()).append("\n");
            }
            for (XWPFTable table : doc.getTables()) {
                table.getRows().forEach(row -> {
                    row.getTableCells().forEach(cell -> sb.append(cell.getText()).append(" | "));
                    sb.append("\n");
                });
            }
            return sb.toString();
        }
    }

    private String extractExcel(InputStream is) throws IOException {
        try (Workbook workbook = WorkbookFactory.create(is)) {
            StringBuilder sb = new StringBuilder();
            for (int i = 0; i < workbook.getNumberOfSheets(); i++) {
                Sheet sheet = workbook.getSheetAt(i);
                sb.append("Sheet: ").append(sheet.getSheetName()).append("\n");
                for (Row row : sheet) {
                    for (Cell cell : row) {
                        sb.append(getCellValue(cell)).append(" | ");
                    }
                    sb.append("\n");
                }
                if (sb.length() > MAX_CHARS) break;
            }
            return sb.toString();
        }
    }

    private String getCellValue(Cell cell) {
        if (cell == null) return "";
        return switch (cell.getCellType()) {
            case STRING -> cell.getStringCellValue();
            case NUMERIC -> String.valueOf(cell.getNumericCellValue());
            case BOOLEAN -> String.valueOf(cell.getBooleanCellValue());
            case FORMULA -> cell.getCellFormula();
            default -> "";
        };
    }

    private String truncateText(String text) {
        if (text == null) return "";
        if (text.length() <= MAX_CHARS) return text;
        return text.substring(0, MAX_CHARS) + "\n\n[File truncated because it is long.]";
    }

    public record FileResult(String name, String content, String base64) {}
}
