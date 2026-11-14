package com.example.vetpassport.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

/**
 * PageController – tüm frontend sayfa yönlendirmelerini yönetir.
 * Vize aşamasında iş mantığı ve veritabanı bağlantısı yoktur;
 * yalnızca Thymeleaf template isimlerini döndürür.
 */
@Controller
public class PageController {

    /** Ana sayfa / karşılama ekranı */
    @GetMapping("/")
    public String index() {
        return "index";
    }

    /** Giriş ekranı (rol seçimi: OWNER | VET) */
    @GetMapping("/login")
    public String login() {
        return "login";
    }

    /** Kullanıcı / veteriner kontrol paneli */
    @GetMapping("/dashboard")
    public String dashboard() {
        return "dashboard";
    }

    /** Yeni evcil hayvan kayıt formu */
    @GetMapping("/pets/new")
    public String petAdd() {
        return "pet-add";
    }

    /** Sağlık pasaportu görüntüleme */
    @GetMapping("/passport")
    public String passport() {
        return "passport";
    }

    /** Randevu listesi ve yeni randevu alma */
    @GetMapping("/appointments")
    public String appointments() {
        return "appointments";
    }

    /** Veteriner muayene / aşı tamamlama ekranı */
    @GetMapping("/vet/exam")
    public String vetExam() {
        return "vet-exam";
    }

    /** Acil durum kartı – nöbetçi klinikler */
    @GetMapping("/emergency")
    public String emergencyCard() {
        return "emergency-card";
    }
}
