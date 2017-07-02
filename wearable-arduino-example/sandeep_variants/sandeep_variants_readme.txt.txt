user/AppData/Local/Arduino15/packages/sandeepmistry/hardware/nRF5/0.3.0

1) add entry to boards.txt

2) add folder and files to user/AppData/Local/Arduino15/packages/sandeepmistry/hardware/nRF5/0.3.0/variants


from boards.txt:

Childmind.name=Child Mind nRF52

Childmind.upload.tool=sandeepmistry:openocd
Childmind.upload.target=nrf52
Childmind.upload.maximum_size=524288

Childmind.bootloader.tool=sandeepmistry:openocd

Childmind.build.mcu=cortex-m4
Childmind.build.f_cpu=16000000
Childmind.build.board=CHILDMIND
Childmind.build.core=nRF5
Childmind.build.variant=Childmind
Childmind.build.variant_system_lib=
Childmind.build.extra_flags=-DNRF52
Childmind.build.float_flags=-mfloat-abi=hard -mfpu=fpv4-sp-d16
Childmind.build.ldscript=nrf52_xxaa.ld

Childmind.menu.softdevice.none=None
Childmind.menu.softdevice.none.softdevice=none

Childmind.menu.softdevice.s132=S132
Childmind.menu.softdevice.s132.softdevice=s132
Childmind.menu.softdevice.s132.softdeviceversion=2.0.1
Childmind.menu.softdevice.s132.upload.maximum_size=409600
Childmind.menu.softdevice.s132.build.extra_flags=-DNRF52 -DS132 -DNRF51_S132
Childmind.menu.softdevice.s132.build.ldscript=armgcc_s132_nrf52832_xxaa.ld

Childmind.menu.lfclk.lfxo=Crystal Oscillator
Childmind.menu.lfclk.lfxo.build.lfclk_flags=-DUSE_LFXO
Childmind.menu.lfclk.lfrc=RC Oscillator
Childmind.menu.lfclk.lfrc.build.lfclk_flags=-DUSE_LFRC
Childmind.menu.lfclk.lfsynt=Synthesized
Childmind.menu.lfclk.lfsynt.build.lfclk_flags=-DUSE_LFSYNT