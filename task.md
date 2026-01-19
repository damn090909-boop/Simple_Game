# Family Town 개발 가이드라인

## 1. 프로젝트 개요
**대상 플랫폼:** iOS/iPadOS Chrome 브라우저 (PWA 독립 실행)
**핵심 컨셉:** 4인 가족 멀티플레이어 게임 (RPG + 시뮬레이션)
**기술 스택:** 
- **프론트엔드:** PixiJS v7+ (렌더링), Firebase v9 모듈형 (인증/DB)
- **스타일:** 48px 그리드 타일, 골격(Cutout) 애니메이션, Skeletal Animation, 픽셀 아트 (Nearest Scale)

## 2. 기술적 제약 사항 및 iOS 최적화
1.  **렌더링:** `PIXI.settings.SCALE_MODE = PIXI.SCALE_MODES.NEAREST` (필수).
2.  **PWA/터치:** 
    - `overscroll-behavior`, `touch-action: none` 엄격 제어.
    - `user-select: none`으로 텍스트 선택/확대경 방지.
    - `apple-mobile-web-app-capable` 메타 태그.
3.  **오디오:** `AudioContext`는 첫 번째 사용자 상호작용(PIN 키패드 터치)에서 재개되어야 함.
4.  **기기 화면비:** 아이폰/아이패드 세로 비율 고정 (데스크톱에서 시뮬레이션, 모바일에서 아이폰/아이패드의 화면을 가로로 눞혀도 세로모드로만 출력).

## 3. 데이터베이스 스키마 (Firebase Realtime DB)
| 경로 | 구조 및 설명 |
| :--- | :--- |
| `users/{userID}` | `{ pin: "1234", avatar: {...} }` |
| `users/{userID}/characters` | 생성된 캐릭터 목록 (최대 3개). |
| `users/{userID}/currentMap` | 현재 위치 ID (기본값: `"world"`). |
| `players/{userID}` | 임시 게임 상태 (x, y, anim, direction). |
| `players/{userID}/stats` | RPG 스탯: `{ level, xp, hp, max_hp, str... }`. |
| `players/{userID}/inventory` | 개인 아이템. |
| `players/{userID}/wallet` | 화폐: `{ gold: 1000 }`. |
| `world/buildings/{buildID}` | 외부 건물: `{ type, x, y, owner, interiorID }`. |
| `world/drops` | 공유 필드 아이템 (FIFO 픽업). |
| `interiors/{interiorID}/items` | 집 내부 가구 배치. |
| `trades/{sessionID}` | P2P 거래 세션 데이터. |

## 4. 모듈 사양

### A. 인증 시스템 (`src/auth.js`)
- **UI (인트로):** 4개의 분리된 정사각형 입력 박스 (중앙 정렬). 아래: "접속" 버튼 (PIN이 유효할 때만 활성화). 아래: "Auth Key 생성" 텍스트 링크.
- **UI (생성 팝업):** 4개 입력 박스 (새 PIN) + 4개 입력 박스 (PIN 확인). "생성" 버튼은 둘이 일치할 때만 활성화.
- **로직:** DB에 대한 실시간 PIN 검증으로 접속 버튼 활성화. 입력 시 다음 박스로 자동 포커스.
- **트리거:** 첫 상호작용에서 AudioContext 재개.

### B. 로비 및 커스터마이징 (`src/lobby.js`)
- **슬롯:** 3개의 캐릭터 카드.
    - *존재:* 
        - 레이아웃: 50% 왼쪽 (초상화), 50% 오른쪽 (정보 + 버튼).
        - 오른쪽 열: 상단에 이름/정보, 하단에 삭제/접속 버튼.
        - 버튼: 일관된 작은 크기, 오른쪽 하단 정렬.
    - *빈 슬롯:* 검은 실루엣 + [+] 버튼.
- **캐릭터 생성기:** 
    - **파츠:** 몸, 머리 (뼈 토글), 얼굴 (스프라이트 토글).
    - **색상:** 틴트 적용 (그레이스케일/흰색 소스 에셋 필요).
    - **저장:** JSON 구조를 `users/{uid}/characters`에 저장.

### C. 게임 엔진 코어 (`src/engine.js`, `src/camera.js`)
- **뷰포트:** 모바일 전체 화면(아이폰/아이패드 세로모드 고정).
- **Z-정렬:** **중요.** 깊이를 확인하기 위해 매 프레임마다 Y 좌표로 `WorldContainer` 자식 재정렬.
- **골격 렌더러:** 코드 측에서 Container 뼈를 회전하여 절차적 애니메이션 (걷기).
- **카메라/줌:** 
    - 토글 버튼 `[ 🔍 ]`: **48px (1.0x)**와 **64px (1.33x)** 사이 전환.
    - **중앙 정렬:** 로컬 플레이어는 항상 화면 중앙에 있어야 함.


    ## C-1. Game UI & HUD (src/ui.js)
*모든 UI는 게임 화면 위에 떠 있는(Overlay) 반투명 스타일이다.*
- **Top-Left:** `[ ☰ ]` (Menu).
- **Top-Right:** `[ 👥 ]` (Friends), `[ 🔍 ]` (Zoom Toggle 48px/64px).
- **Bottom-Left:**
  - `[ 🎒 ]` (Inventory).
  - `[ 💬 ]` (Chat): **채팅 토글 버튼**.

## C-2. Chat Interface (src/ui.js & src/network.js) - *Updated Requirement*
- **Layout:**
  - 평소에는 **하단에 빈 공간(여백)이 절대 없어야 한다.** (Full Screen Game).
  - 좌측 하단 `[ 💬 ]` 버튼 클릭 시, 숨겨져 있던 **'입력창(Input Bar)'**이 키보드와 함께 화면 하단에서 슬라이드 업 된다.
  - 입력창 활성화 시, 게임 Canvas가 찌그러지지 않도록 `VisualViewport` API를 활용하거나 CSS `bottom` 값을 키보드 높이에 맞춰 조정한다.
  - 메시지 전송(Enter) 또는 배경 터치 시, 키보드와 입력창은 다시 숨겨진다.
- **Bubble:** 캐릭터 머리 위 말풍선 표시 (5초 후 소멸).

## C-3. In-Game Engine (src/engine.js)
- **Render:** 48px Tilemap, Nearest Neighbor Scale.
- **Skeletal:** JSON 데이터 기반 파츠 조립 및 절차적 애니메이션.
- **Z-Sorting:** Y좌표 기준 깊이 정렬.
- **Camera:** 줌/키보드 활성화 시에도 내 캐릭터 중심 유지.

## C-4. Resource & Item Drop System (src/item_manager.js)
- **Data Sync:**
  - `world/drops` 경로에 필드 아이템을 동기화하여 모든 가족이 공유한다 (선착순 줍기).
  - `players/{ID}/inventory` 경로에 개인 소지품 수량을 관리한다.

- **Harvesting Action:**
  - 자원(나무, 돌) 터치 시 캐릭터가 접근하여 채집 애니메이션을 수행한다.
  - 채집 성공 시, 자원 위치 주변 랜덤한 좌표(반경 1타일 이내)에 아이템 데이터를 생성(`push`)한다.
  - **Visual:** 자원 스프라이트에 `Shake`(흔들림) 효과를 준다.

- **Drop Animation (Parabola):**
  - 아이템 생성 시, 즉시 바닥에 배치하지 않고 **'위로 솟구쳤다가 떨어지는'** 포물선 트윈(Tween) 애니메이션을 적용한다.
  - 아이템 아래에 반투명 그림자(Shadow)를 렌더링하여 입체감을 준다.

- **Looting Action:**
  - 떨어진 아이템 터치 시 `Fly-to-UI` 효과 실행:
    - 아이템이 화면 좌측 하단 `[ 🎒 ]` 버튼 위치로 베지에 곡선을 그리며 날아간다.
    - 도착 즉시 DB에서 해당 Drop 데이터를 삭제하고, 인벤토리 수량을 증가시킨다.


## C-5. Data Schema (Firebase Structure)
- **`players/{userID}/wallet`**: 재화 보유량. `{ gold: 1000 }`.
- **`server/daily_seed`**: 매일 00시에 갱신되는 난수 시드값 (물가 변동용).
- **`trades/{sessionID}`**: 실시간 거래 세션 데이터.
  - `{ p1: "dad", p2: "mom", p1_offer: {...}, p2_offer: {...}, status: "locked"|"confirmed" }`

## C-6. Shop System (Town Center) - `src/shop.js`
- **Location & Interaction:**
  - 맵 정중앙(예: 50, 50)에 '상점 건물'을 고정 배치한다.
  - 상점 터치 시, 화면 전환 없이 **'상점 UI 모달(Popup)'**을 띄운다.
- **Dynamic Pricing (24h Cycle):**
  - **Algorithm:** 아이템의 기본 가격(Base Price)에 `Daily Random Multiplier`를 곱해 가격을 결정한다.
  - **Sync:** 모든 가족이 동일한 가격을 봐야 하므로, `new Date().toDateString()`(날짜 문자열)을 시드(Seed)로 하는 난수 발생기를 사용하여 가격 변동폭(0.8 ~ 1.3배)을 계산한다.
  - **UI:** [구매] 탭과 [판매] 탭으로 나뉘며, 내 인벤토리 아이템을 선택해 판매하면 즉시 `gold`가 증가한다.

## C-7. P2P Interaction (Friend Trade) - `src/interaction.js`
- **Approach Logic (이동):**
  - 화면 내의 **친구 캐릭터**를 터치하면 이동 로직이 실행된다.
  - **Pathfinding:** 친구의 좌표가 목표가 아니라, 친구의 **'상하좌우 인접 타일 중 빈 곳'**을 목표로 설정한다. (겹침 방지).
  - 이동 후 친구를 바라보며 멈춘다.
- **Interaction Bubble:**
  - 도착 시, 친구 머리 위에 **[ 🤝 거래하기 ]** 버튼 모양의 말풍선을 띄운다.
  - 내가 버튼을 누르면 상대방에게 '거래 요청' 팝업이 뜬다.

## C-8. Trade Interface - `src/trade.js`
- **Trade Window:**
  - 화면이 반으로 나뉘어 **[내 제안]**과 **[상대 제안]** 영역이 표시된다.
  - 인벤토리에서 아이템이나 골드를 등록할 수 있다.
- **Flow:**
  1. **Offer:** 양쪽이 주고받을 물품을 올린다.
  2. **Lock:** [준비 완료]를 누르면 수정이 불가능해진다 (Lock 상태).
  3. **Confirm:** 양쪽 모두 [교환 확정]을 누르면 서버 트랜잭션을 통해 소유권이 이전된다.


### D. 입력 및 이동 (`src/pathfinder.js`, `src/input.js`)
- **제어:** 탭하여 이동 (포인트 앤 클릭).
- **피드백:** 터치 지점에 시각적 '타겟 마커' 애니메이션 (0.5초).
- **로직:** 
    1. 그리드 변환 -> 충돌 체크 (`1` = 차단).
    2. **A* 경로 찾기:** 최단 경로 계산.
    3. **스무딩:** 타일 간 Lerp 이동. 방향에 따라 스프라이트 미러링.

### E. 네트워크 및 채팅 (`src/network.js`, `src/ui.js`)
- **동기화:** 
    - 로컬: 100ms 쓰로틀.
    - 원격: 부드러운 랙 보상을 위한 선형 보간(Lerp).
- **오프라인:** `onDisconnect`를 처리하여 플레이어 존재 제거.
- **채팅:** 
    - 입력: 기본적으로 숨김. `[ 💬 ]` 토글로 키보드 + 입력 바 슬라이드 업. 
    - **간격 없음:** 입력 바가 흰 공간 없이 키보드 위에 위치하도록 뷰포트 조정 보장.
    - **표시:** 머리 위 말풍선 (둥근 사각형), 5초 후 자동 소멸.

### F. 주택 및 인테리어 (`src/housing.js`, `src/interior.js`, `src/portal.js`)
- **고스트 건물:** 커서를 따라가는 3x3 반투명 시각. 배치가 유효하지 않으면 빨간색 틴트.
- **배치:** 특정 3x3 그리드 영역을 `Collision(1)`로 업데이트.
- **포털:** 
    - **입장:** '문' 타일 탭 -> 페이드 아웃 -> `currentMap` 전환 -> 인테리어로 텔레포트.
    - **퇴장:** '매트' 타일 탭 -> 페이드 아웃 -> `world` 전환 -> 문 앞으로 텔레포트.
- **필터링:** 동일한 `currentMap` ID를 공유하는 엔티티만 렌더링.
- **인테리어:** 10x10 고정 방. 가구 배치 허용 (문 앞 제외).

### G. 경제 및 거래 (`src/shop.js`, `src/trade.js`)
- **상점:** 고정 맵 위치 (타운 센터). 모달 팝업.
    - **동적 가격:** 시드(`DateString`) 기반 일일 변동. 범위: 0.8 ~ 1.3배.
- **P2P 거래:**
    - **상호작용:** 사용자 탭 -> 인접 타일로 이동 -> `[ 🤝 거래 ]` 말풍선 표시.
    - **흐름:** 요청 -> 창 열기 -> 제안 -> 잠금 -> 확인 -> 거래.

### H. RPG 및 전투 (`src/rpg_core.js`, `src/monster.js`)
- **스탯:** 레벨, XP, HP/MaxHP, Str/Vit/Int/Agi.
- **진행:** 레벨 업 -> +3 자유 포인트.
- **몬스터:** 
    - **AI:** 대기 (랜덤 워크) -> 감지 (3타일) -> 추격 -> 공격 (1타일).
    - **전투:** 단순 HP 감소.
- **사망:** `HP <= 0` -> 기절 상태 -> 화면 페이드 -> 3초 후 "우물" (타운 센터)에서 리스폰.

## H-1. RPG Stats, Combat & Death
`src/rpg_core.js`, `src/monster.js` 를 작성하라.

1. Player Stats (Data Structure)
   - `players/{ID}/stats` 경로에 데이터 추가.
   - 기본값: `{ level: 1, xp: 0, hp: 100, max_hp: 100, str: 5, vit: 5, int: 5, agi: 5, def: 0, free_points: 0 }`.
   - **Level Up Logic:** 경험치(xp) 획득 시 `(Level * 100)` 도달하면 레벨업. `free_points` +3 지급. UI에서 스탯 투자 가능.

2. Monster System
   - 특정 구역(예: 마을 밖 숲)에 몬스터 스폰.
   - **AI Logic:**
     - 평소: 랜덤 배회 (Idle).
     - 감지: 플레이어가 3타일 내 접근 시 추격(Chase).
     - 공격: 1타일 인접 시 공격 (플레이어 HP 감소).
   - 처치 시: 경험치 지급 및 시체 소멸.

3. Death & Respawn (Faint)
   - 플레이어 `hp <= 0` 도달 시:
     - 상태를 `fainted`(기절)로 변경하고 조작 차단.
     - 화면 암전(Fade Out) 후 3초 뒤 '마을 우물(Town Well)' 좌표(예: 50, 50)로 강제 이동.
     - HP 100% 회복 후 기상(Wake up) 메시지 출력.

## H-2. Object Regeneration System
`src/environment.js` 를 작성하라.

1. Object Lifecycle
   - 자원(나무, 돌, 꽃) 채집(제거) 시, DB에서 완전히 삭제하지 않고 상태를 `{ active: false, respawnAt: timestamp }`로 업데이트한다.
   - **Respawn Time:**
     - 풀/꽃: 1분 (테스트용 짧은 시간)
     - 나무: 5분
     - 돌/광석: 10분
     (상수는 `config.js`에서 관리하여 추후 미세조정 용이하게 할 것)

2. Rendering Logic
   - `active: false`인 객체는 화면에 렌더링하지 않는다 (투명 처리 및 충돌 해제).
   - 클라이언트 `ticker`(루프)에서 1초마다 `CurrentTime > respawnAt`을 검사하여, 시간이 되면 다시 `active: true`로 렌더링하고 충돌(Collision)을 활성화한다.

## H-3. Inn & Rental System
`src/housing_rental.js` 를 작성하라.

1. Restriction (건축 제한)
   - `Housing` 시스템의 '건축 모드'는 사용자가 충분한 재화(Gold)와 재료(Wood/Stone)를 보유하기 전까지 잠금(Lock) 처리한다.

2. The Inn (여관/렌탈)
   - 마을에 '여관(Inn)' 건물을 배치한다.
   - 상호작용 시 **[방 렌탈]** 팝업 출력.
   - **Rental Logic:**
     - 소액의 골드(예: 100G)를 지불하면 `Inn Room`으로 입장할 수 있는 권한 획득.
     - `player.spawnPoint`가 여관방 침대로 변경됨.
   - **Data:** `players/{ID}/rental` 정보에 만료 시간 등을 기록.

3. Economy Updates
   - 추후 '땅 매매', '세금' 기능을 위해 `world/land_prices` (땅 시세) 데이터 구조를 미리 잡아둔다.

### I. 환경 및 자원 (`src/environment.js`)
- **채집:** 자원 탭 (나무/바위) -> 흔들림 애니메이션 -> 아이템 드롭.
- **드롭:** 포물선 트윈 애니메이션 (위 -> 아래). 그림자 투사.
- **루팅:** 드롭 탭 -> 가방으로 날아가는 애니메이션 (베지어) -> 인벤토리 `+1`.
- **재생:** 
    - 고갈된 객체는 `active: false` 설정 (보이지 않음/충돌 없음).
    - 타이머 체크 (예: 나무 5분) -> `active: true`로 복원.

### J. 임대 시스템 (`src/housing_rental.js`)
- **여관:** 집이 없는 플레이어를 위한 임대 방.
- **로직:** 골드 지불 -> 여관 방으로 스폰 포인트 설정.

## K. 에셋 규칙
- **경로:** `assets/`
- **이름 지정:** 
    - 파츠: `body_basic.png`, `head_{n}.png`, `arm_basic.png`
    - 타일: `tile_grass.png`, `tile_wall.png`
    - 객체: `building_house_01.png` (3x3), `furniture_bed.png`
- **틴트 규칙:** 모든 틴트 가능 스프라이트 (피부, 머리)는 **반드시 그레이스케일 또는 흰색**이어야 함.

## 6. 테스트 자격 증명
- **테스트 PIN:** `0000`
