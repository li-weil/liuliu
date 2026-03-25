package com.liuliu.citywalk;

import com.liuliu.citywalk.config.WechatOpenProperties;
import com.liuliu.citywalk.config.GeminiProperties;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;

@SpringBootApplication
@EnableConfigurationProperties({WechatOpenProperties.class, GeminiProperties.class})
public class CityWalkBackendApplication {

    public static void main(String[] args) {
        SpringApplication.run(CityWalkBackendApplication.class, args);
    }
}
