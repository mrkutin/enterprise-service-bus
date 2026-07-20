[![Moleculer](https://badgen.net/badge/Powered%20by/Moleculer/0e83cd)](https://moleculer.services)

# enterprise-service-bus
This is a [Moleculer](https://moleculer.services/)-based microservices project. Generated with the [Moleculer CLI](https://moleculer.services/docs/0.14/moleculer-cli.html).

## Описание веток
В проекте ветки делятся на 3 типа
- отдельные ветки под задачи в Jira (именуются согласно задачам: CB-100, CB-101 и тд.)
- test ветка с автодеплоем в тестовую среду
- master ветка с автодеплоем в продовую среду

## Описание локального запуска
Шину можно запускать локально для тестирования или внесения изменений. Для этого используются файлы с переменными окружения .prod.env (только в экстренных случаях) и .test.env, стандартно используется .test.env.
Env файлы имеют вид:
```
REDIS_HOST = 'test-redis-host'
REDIS_PORT = 6380
REDIS_PASSWORD = 'test-redis-pass'
```
В стандартном для локального тестирования .test.env файле указаны dev кластеры kafka и redis, чтобы изменения локального запуска не подхватывались тестовой средой. При необходимости можно использовать кластеры test среды, раскомментировав необходимые параметры. 

Локально можно запустить шину следующими способами:
- запуск всех сервисов
- запуск отдельного сервиса
- запуск нескольких сервисов
- запуск готовых сценариев тестирования

**Запуск всех сервисов**

Осуществляется с помощью скрипта start командой `npm run start` (файл .test.env должен быть правильно заполнен)

**Отдельный сервис**

Можно запустить, внеся изменения в start скрипт:

`SERVICEDIR= moleculer-runner --repl -E .test.env services/api.service.js`

**Несколько сервисов**: 

`SERVICEDIR= moleculer-runner --repl -E .test.env services/api.service.js services/puller.service.js`

**Сценарии.**

В файле package.json указаны конфигурации запуска готовых сценариев тестирования. Пример:

`"scenario:incoming-orders": "SERVICEDIR= moleculer-runner --repl -E .test.env services/puller.service.js services/incoming.orders.generator.service.js services/crm.service.js scenario/incoming.orders.scenario.service.js"`

В этом случае запускается сервис / связка сервисов для проверки конкретного сценария работы шины (например, генерация и отправка заказа из аксапты в crm систему).
Сценарии тестирования находятся в папке scenario и представляют собой скрипты передачи тестовых данных в кафку шины, которые затем используются запущенной связкой сервисов.

**ВАЖНО**: с момента включения опции `fromBeginning: true` на всех консьюмерах кафки шины, сначала нужно запускать связку сервисов, затем конктерный сценарий. В ином случае данные для тестирования могут не поступить в сервисы.

## Мерж веток и деплой
Деплой устроен по следующей схеме:
1. Создаются ветки по задачам Jira (CB-100, CB-101)
2. Ветки по задачам тестируются локально
3. Создается мерж реквест в test ветку: https://git.prosv.ru/Architecture/enterprise-service-bus/-/merge_requests/?sort=created_date&state=all&first_page_size=20 

   При мерже происходит автодеплой test среды:
   https://git.prosv.ru/Architecture/enterprise-service-bus/-/pipelines
4. Создается мерж реквест из test в master ветку (Release): https://git.prosv.ru/Architecture/enterprise-service-bus/-/merge_requests/?sort=created_date&state=all&first_page_size=20

   При мерже происходит автодеплой prod среды:
   https://git.prosv.ru/Architecture/enterprise-service-bus/-/pipelines

## Проверка деплоя
При мерже в test/prod ветки нужно проверять основные моменты деплоя:
1. Проверить пайплайны - https://git.prosv.ru/Architecture/enterprise-service-bus/-/pipelines
2. Проверить запуск контейнеров в Kubernetes на предмет рестартов подов:
- test: https://dashboard-hw.dev.yc.prosv.ru/#/namespace?namespace=bus-dev
- prod: https://dashboard-hw.prod.yc.prosv.ru/#/pod?namespace=bus-prod
3. Проверить логи на предмет ошибок:
- test: https://opensearch-dashboards.dev.yc.prosv.ru
- prod: https://opensearch-dashboards.prod.yc.prosv.ru

## Мониторинг
При деплоях и в обычном режиме работы шины важно проверять потребления сервисов и компонентов шины.

Мониторинг mongodb:
- test: https://console.yandex.cloud/folders/b1gdda6n1cbpf6s2ntmo/managed-mongodb/cluster/c9qd5c05rupi9vnpqig4/monitoring
- prod: https://console.yandex.cloud/folders/b1gtvpi4ur1i0rme9jjb/managed-mongodb/cluster/c9ql6a1rpv9nkl7g2jb9/monitoring

Мониторинг kafka:
- test: https://console.yandex.cloud/folders/b1gdda6n1cbpf6s2ntmo/managed-kafka/cluster/c9qh699kv6js4baomkra/monitoring
- prod: https://console.yandex.cloud/folders/b1gq0s87ibubn5npgcrh/managed-kafka/cluster/c9qr6peanklvlmcnjand/monitoring

Мониторинг redis:
- test: https://console.yandex.cloud/folders/b1gdda6n1cbpf6s2ntmo/managed-redis/cluster/c9qjmgvevv84cqu6t85c/monitoring
- prod: https://console.yandex.cloud/folders/b1gq0s87ibubn5npgcrh/managed-redis/cluster/c9qdug1ksqpn0pvs6f29/monitoring

Мониторинг сервисов:
- test: https://grafana-hw.dev.yc.prosv.ru/d/85a562078cdf77779eaa1add43ccec1e/kubernetes-compute-resources-namespace-pods?orgId=1&refresh=10s&var-datasource=default&var-cluster=&var-namespace=bus-dev
- prod: https://grafana-hw.prod.yc.prosv.ru/d/85a562078cdf77779eaa1add43ccec1e/kubernetes-compute-resources-namespace-pods?orgId=1&from=now-5d&to=now&timezone=utc&var-datasource=default&var-cluster=&var-namespace=bus-prod&refresh=10s
