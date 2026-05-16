# YCup Stage 6. 刘慈欣 题解

## 鲸歌

【答案】$\boxed{2}$

【解析】对 $A$ 的位置进行分类讨论

当 $A$ 与 $C$ 重合时，点 $Q$ 的轨迹为以 $(-1, 0)$ 为圆心，$2$ 为半径的圆

当 $A$ 在圆内且不与 $C$ 重合时，有 $\lvert CQ\rvert +\lvert AQ\rvert=\lvert CQ\rvert +\lvert PQ\rvert=\lvert CP\rvert=4$

所以此时点 $Q$ 的轨迹为以 $C, A$ 为焦点，长轴为 $4$ 的椭圆上

当 $A$ 在圆上时，$AP$ 的中垂线始终与 $CP$ 交与点 $C$，故点 $Q$ 的轨迹即为点 $C$

在 $A$ 在圆外时，若 $Q$ 在 $CP$ 延长线上，则 $\lvert CQ\rvert-\lvert AQ\rvert=4$；若 $Q$ 在 $PC$ 延长线上，则 $\lvert AQ\rvert -\lvert CQ\rvert=4$。因此点 $Q$ 的轨迹为以 $C, A$ 为焦点，长轴为 $4$ 的双曲线上

【如何提交】这个二进制数是 $(00010)_2$，转为十进制数即为 $2$

## 流浪地球

【答案】$\boxed{122}$

【解析】如果你直接按卡西欧的话，会出现结果是 $\dfrac{2018}{5}$，然而这是不正确的

**引理：** 对于首一 $n$ 次多项式 $p(x)$，$\mathcal{z}_k(0\le k<n)$ 为其 $n$ 个复根，则对于任意复数 $\mathcal{z}$，都有
$$
\sum_{k=0}^{n-1} \dfrac{1}{\mathcal{z}-\mathcal{z}_k}=\dfrac{p'(\mathcal{z})}{p(\mathcal{z})}
$$
**引理略证：** 可记 $\displaystyle p(\mathcal{z})=\prod_{k=0}^{n-1} (\mathcal{z}-\mathcal{z}_k)$，两边取对数得 $\displaystyle \ln p(\mathcal{z})=\sum_{k=0}^{n-1} \ln(\mathcal{z}-\mathcal{z}_k)$

两边求导得 $\displaystyle \dfrac{p'(\mathcal{z})}{p(\mathcal{z})}=\sum_{k=0}^{n-1} \dfrac{1}{\mathcal{z}-\mathcal{z}_k}$，得证

**注意：** 由于多项式函数和复数域对数函数均为全纯函数，所以可以在 $\mathbf{C}$ 上求导

首先，将 $\cos\dfrac{k\pi}{1009}$ 变为 $\cos\dfrac{2k\pi}{2018}$，联想到欧拉公式

由于 $\mathrm{e}^{\mathrm{i}\theta}=\cos \theta+\mathrm{i}\sin \theta$，$\mathrm{e}^{-\mathrm{i}\theta}=\cos \theta-\mathrm{i}\sin \theta$，因此 $\cos \theta=\dfrac{\mathrm{e}^{\mathrm{i}\theta}+\mathrm{e}^{-\mathrm{i}\theta}}{2}$

也即 $\cos\dfrac{2k\pi}{2018}=\dfrac{\mathrm{e}^{\frac{2k\pi}{2018}\mathrm{i}}+\mathrm{e}^{-\frac{2k\pi}{2018}\mathrm{i}}}{2}$

同时，$\mathrm{e}^{\frac{2k\pi}{2018}\mathrm{i}}$ 为多项式 $p(x)$ 的根，其中 $p(x)=x^{2018}-1$

记 $\mathcal{z}_k=\mathrm{e}^{\frac{2k\pi}{2018}\mathrm{i}}$，则 $\cos\dfrac{2k\pi}{2018}=\dfrac{\mathcal{z}_k+\mathcal{z}_k^{-1}}{2}$

因此 $\dfrac{5+\dfrac{\mathcal{z}_k+\mathcal{z}_k^{-1}}{2}}{26+10\dfrac{\mathcal{z}_k+\mathcal{z}_k^{-1}}{2}}=\dfrac{\mathcal{z}_k^2+10\mathcal{z}_k+1}{10(\mathcal{z}_k+5)(\mathcal{z}_k+\dfrac{1}{5})}=\dfrac{1}{10}+\dfrac{1}{2(\mathcal{z}_k+5)}-\dfrac{1}{50(\mathcal{z}_k+\dfrac{1}{5})}$

原式即为 $\displaystyle \sum_{k=0}^{2017} \dfrac{1}{10}+\dfrac{1}{2}\sum_{k=0}^{2017}\dfrac{1}{\mathcal{z}_k+5}-\dfrac{1}{50}\sum_{k=0}^{2017}\dfrac{1}{\mathcal{z}_k+\dfrac{1}{5}}$

应用引理，原式即为 $\dfrac{2018}{10}-\dfrac{p'(-5)}{2p(-5)}+\dfrac{p'(-\dfrac{1}{5})}{50p(-\dfrac{1}{5})}=\dfrac{2018\times 5^{2017}}{5^{2018}-1}$

【如何提交】$p=2018\times 5^{2017}, q=5^{2018}-1$，故 $\dfrac{p}{2018}+q+1=5^{2017}+5^{2018}\equiv 122 \pmod{139}$

## 地火

【答案】$\boxed{4013}$

【解析】等差数列必然形如 $a, a+d, a+2d$，对于固定的 $d$，有 $1\le a\le 2006-2d$

因此可行方案数为 $\displaystyle \sum_{d=1}^{1002} (2006-2d)=1002\times 1003$

总方案数为 $\displaystyle \binom{2006}{3}=\dfrac{2006\times 2005\times 2004}{6}$

因此概率为 $\dfrac{3}{4010}$

【如何提交】分子分母之和为 $3+4010=4013$

## 地球大炮

【答案】$\boxed{14}$

【解析】这是一道球面三角学问题，你需要先将经纬度形式的坐标转化为空间直角坐标系，然后就是一道校内立体几何题

具体地，如果点 $A$ 的经纬度坐标为 $(\theta, \varphi)$，那么转化为空间直角坐标就是 $(\cos \theta\cos \varphi, \cos \theta\sin \varphi, \sin \theta)$

然后问题转化为求 $D$ 到平面 $ABC$ 的距离。你可以求出面 $ABC$ 的法向量，然后求 $\overrightarrow{AD}$ 在法向量上的数量投影长度，得到答案为 $5671.06$

由于赛前提示你要熟练运用卡西欧的向量功能，所以你应该能够在相当短的时间内计算出法向量

计算过程可以参考如下 C++ 代码：

```cpp
#include <cmath>
#include <cstdio>
using namespace std;
const double R = 6400, pi = acos(-1.0);
const double a1 = 40, b1 = -75;
const double a2 = 30, b2 = 120;
const double a3 = 50, b3 = 0;
const double a4 = -30, b4 = 150;
int main(){
    double t1 = a1 / 180 * pi, l1 = b1 / 180 * pi;
    double t2 = a2 / 180 * pi, l2 = b2 / 180 * pi;
    double t3 = a3 / 180 * pi, l3 = b3 / 180 * pi;
    double t4 = a4 / 180 * pi, l4 = b4 / 180 * pi;
    double x1 = R * cos(t1) * cos(l1), y1 = R * cos(t1) * sin(l1), z1 = R * sin(t1);
    double x2 = R * cos(t2) * cos(l2), y2 = R * cos(t2) * sin(l2), z2 = R * sin(t2);
    double x3 = R * cos(t3) * cos(l3), y3 = R * cos(t3) * sin(l3), z3 = R * sin(t3);
    double x4 = R * cos(t4) * cos(l4), y4 = R * cos(t4) * sin(l4), z4 = R * sin(t4);
    double xab = x2 - x1, yab = y2 - y1, zab = z2 - z1;
    double xac = x3 - x1, yac = y3 - y1, zac = z3 - z1;
    double xad = x4 - x1, yad = y4 - y1, zad = z4 - z1;
    double xn = yab * zac - zab * yac, yn = zab * xac - xab * zac, zn = xab * yac - yab * xac;
    double fp = sqrt(xn * xn + yn * yn + zn * zn);
    double fq = fabs(xad * xn + yad * yn + zad * zn);
    double ans = fq / fp;
    printf("%.8lf\n", ans);
}
```

【如何提交】$\dfrac{5671.06}{400}\approx 14.17765$，取整为 $14$

## 混沌蝴蝶

【答案】$\boxed{85}$

【解析】由于 $G$ 为重心，故 $\overrightarrow{OG}=\dfrac{1}{3}\overrightarrow{a}+\dfrac{1}{3}\overrightarrow{b}$

设 $\overrightarrow{OG}=x\overrightarrow{OP}+y\overrightarrow{OQ}=xh\overrightarrow{OP}+yk\overrightarrow{OQ}$

则有 $x+y=1$ 且 $xh=yk=\dfrac{1}{3}$

故 $\dfrac{1}{h}+\dfrac{1}{k}=3(x+y)=3$，得 $k=\dfrac{h}{3h-1}$

根据 $0<k\le 1, 0<h\le 1$ 可得 $h\in [\dfrac{1}{2}, 1]$

故 $\dfrac{S_{\Delta OPQ}}{S_{\Delta OAB}}=kh=\dfrac{h^2}{3h-1}=\dfrac{1}{9}(3h-1+\dfrac{1}{3h-1}+2)\in[\dfrac{4}{9},\dfrac{1}{2}]$

【如何提交】$\dfrac{4}{9}\times \dfrac{1}{2}=\dfrac{2}{9}$，$2^2+9^2=85$

## 乡村教师

【答案】$\boxed{216}$

【解析】根据【如何提交】部分的提示，我们将答案减一，问题就是 $S$ 存在一个 $n$ 元子集，使得任意五个元素中都有两个不互素，求 $n$ 的最大值

容易想到这个子集应该塞满 $2, 3, 5, 7$ 的倍数，那么这个可以容斥计算

$$
\lfloor\dfrac{280}{2}\rfloor+\lfloor\dfrac{280}{3}\rfloor+\lfloor\dfrac{280}{5}\rfloor+\lfloor\dfrac{280}{7}\rfloor=329
$$

$$
\lfloor\dfrac{280}{6}\rfloor+\lfloor\dfrac{280}{10}\rfloor+\lfloor\dfrac{280}{14}\rfloor+\lfloor\dfrac{280}{15}\rfloor+\lfloor\dfrac{280}{21}\rfloor+\lfloor\dfrac{280}{35}\rfloor=133
$$

$$
\lfloor\dfrac{280}{30}\rfloor+\lfloor\dfrac{280}{42}\rfloor+\lfloor\dfrac{280}{70}\rfloor+\lfloor\dfrac{280}{105}\rfloor=9+6+4+2=21
$$

$$
\lfloor\dfrac{280}{210}\rfloor=1
$$

因此这样 $n$ 的最大值为 $216$，原题中，$n$ 的最小值即为 $217$

【如何提交】参照【解析】，答案减一为 $216$

## 宇宙坍缩

【答案】$\boxed{5}$

【解析】是一道考察不动点原理的基础练习题，不会做的好好反思（而且你可以直接手动迭代找规律）

先解方程 $\dfrac{x^2}{2x-1}=x$，解得 $x=0$ 或 $x=1$

于是你可以构造出 $\varphi(x)=\dfrac{x-1}{x}$，得 $\varphi^{-1}(x)=\dfrac{1}{1-x}$

根据 $f(x)=\varphi^{-1}(g(\varphi(x)))$，代入解得 $g(x)=x^2$

所以有 $f^{(n)}(x)=\varphi^{-1}(g^{(n)}(\varphi(x)))=\dfrac{1}{1-(1-\dfrac{1}{x})^{2^n}}$

得 $2-\dfrac{1}{f^{(10)}(\frac{1}{3})}=1+2^{2^{10}}$

【如何提交】$1+2^{2^{10}}\equiv 5\pmod{127}$

## 信使

【答案】$\boxed{1006}$

【解析】根据和差化积，可以知道

$$
\begin{cases}
2\sin \dfrac{x+y}{2}\cos \dfrac{x-y}{2}=\dfrac{64}{65} \\[8pt]
2\cos \dfrac{x+y}{2}\cos \dfrac{x-y}{2}=\dfrac{8}{65} \\
\end{cases}
$$

两式相除得到 $\tan \dfrac{x+y}{2}=8$

故 $\tan(x+y)=\dfrac{2\tan \dfrac{x+y}{2}}{1-\tan^2 \dfrac{x+y}{2}}=\dfrac{2\times 8}{1-8^2}=-\dfrac{16}{63}$

【如何提交】$16\times 63-\sqrt[4]{16}=1006$

## 朝闻道

【答案】$\boxed{2033}$

【解析】本题有不同的做法

**法一：**
$$
\begin{aligned}
& \sum_{m=1}^{2033} \sum_{n=m}^{2033} \sum_{k=m}^n \binom{n}{k} \binom{k}{m} (-1)^{k+m} \\
=& \sum_{m=1}^{2033} \sum_{n=m}^{2033} \sum_{k=m}^n \binom{n}{m} \binom{n-m}{k-m} (-1)^{k+m} \\
=& \sum_{m=1}^{2033} \sum_{n=m}^{2033} \binom{n}{m} \sum_{k=m}^n \binom{n-m}{k-m} (-1)^{k+m} \\
=& \sum_{m=1}^{2033} \sum_{n=m}^{2033} \binom{n}{m} \sum_{k=0}^{n-m} \binom{n-m}{k} (-1)^k \\
=& \sum_{m=1}^{2033} \sum_{n=m}^{2033} [n=m] \\
=& 2033 \\
\end{aligned}
$$

**法二：**
$$
\begin{aligned}
& \sum_{m=1}^{2033} \sum_{n=m}^{2033} \sum_{k=m}^n \binom{n}{k} \binom{k}{m} (-1)^{k+m} \\
=& \sum_{m=1}^{2033} \sum_{n=m}^{2033} \sum_{k=m}^n (-1)^{k+m} \binom{n}{k} \mathrm{cont} \dfrac{(1+x)^k}{x^m} \\
=& \sum_{m=1}^{2033} \sum_{n=m}^{2033} \mathrm{cont} \dfrac{(-1)^m}{x^m} \sum_{k=m}^n (-1)^k \binom{n}{k} (1+x)^k \\
=& \sum_{m=1}^{2033} \sum_{n=m}^{2033} \mathrm{cont} \dfrac{(-1)^m}{x^m} \left[(-x)^n-\sum_{k=0}^{m-1} (-1)^k \binom{n}{k} (1+x)^k \right] \\
=& \sum_{m=1}^{2033} \sum_{n=m}^{2033} \mathrm{cont} \left[(-1)^{n+m}x^{n-m}\right] \\
=& \sum_{m=1}^{2033} \sum_{n=m}^{2033} [n=m] \\
=& 2033 \\
\end{aligned}
$$

## 三体

【答案】$\boxed{25}$

【解析】考虑按照对 $7$ 的余数进行分类。应有：

$$
S_{0}=\{7, 14, 21, 28, 35, 42, 49\} \\
S_{1}=\{1, 8, 15, 22, 29, 36, 43, 50\} \\
S_{2}=\{2, 9, 16, 23, 30, 37, 44, 51\} \\
S_{3}=\{3, 10, 17, 24, 31, 38, 45, 52\} \\
S_{4}=\{4, 11, 18, 25, 32, 39, 46\} \\
S_{5}=\{5, 12, 19, 26, 33, 40, 47\} \\
S_{6}=\{6, 13, 20, 27, 34, 41, 48\}
$$

$S_{0}$ 中至多取 $1$ 个元素，$S_{1}$ 与 $S_{6}$，$S_{2}$ 与 $S_{5}$，$S_{3}$ 与 $S_{4}$ 不能同时出现，故最大值为 $1+8+8+8=25$

## 黑暗森林

【答案】$\boxed{57}$

【解析】

延长 $BO$ 交 $AC$ 于 $M$，延长 $CO$ 交 $AB$ 于 $N$

由于 $\dfrac{\lvert EK\rvert}{\lvert FK\rvert}=\dfrac{S_{\Delta EOP}}{S_{\Delta FOP}}=\dfrac{S_{\Delta CPE}}{S_{\Delta BPE}}=\dfrac{\lvert PE\rvert \lvert PC\rvert \sin\angle EPC}{\lvert PB\rvert \lvert PF\rvert \sin\angle FPB}=\dfrac{\lvert CN\rvert \lvert BC\rvert \sin\angle OCB}{\lvert BC\rvert \lvert BM\rvert \sin\angle OBC}=\dfrac{\lvert CN\rvert \lvert OB\rvert}{\lvert BM\rvert \lvert CO\rvert}$

然后开始计算

直线 $AB$：$y=2x+5$；直线 $AC$：$y=-x+2$；直线 $OM$：$y=\dfrac{1}{3}x$；直线 $ON$：$y=-\dfrac{1}{3}x$

所以 $M(\dfrac{3}{2}, \dfrac{1}{2}), N(-\dfrac{15}{7}, \dfrac{5}{7})$

得 $\lvert CN\rvert =\dfrac{12\sqrt{10}}{7}, \lvert BM\rvert =\dfrac{3\sqrt{10}}{2}$

因此 $\dfrac{\lvert EK\rvert}{\lvert FK\rvert}=\dfrac{\lvert CN\rvert}{\lvert BM\rvert}=\dfrac{8}{7}$

【如何提交】$8\times 7+1=57$

## 死神永生

【答案】$\boxed{1111}$

【解析】是一道周期题，因为 $3^n \% 11, 7^n \% 11$ 是有周期的

| $n$ | $1$ | $2$ | $3$ | $4$ | $5$ | $6$ | $7$ | $8$ | $9$ | $10$ |
|-----|-----|-----|-----|-----|-----|-----|-----|-----|-----|-----|
| $3^n \% 11$ | $3$ | $9$ | $5$ | $4$ | $1$ | $3$ | $9$ | $5$ | $4$ | $1$ |
| $7^n \% 11$ | $7$ | $5$ | $2$ | $3$ | $10$ | $4$ | $6$ | $9$ | $8$ | $1$ |
| $(3^n+7^n+4) \% 11$ | $3$ | $7$ | $0$ | $0$ | $4$ | $0$ | $8$ | $7$ | $5$ | $6$ |

所以 $n\% 10\in \{3, 4, 6\}$

对于 $n\% 10=3$，有 $3+13+\cdots+83=387$

对于 $n\% 10=4$，有 $4+14+\cdots+84=396$

对于 $n\% 10=6$，有 $6+16+\cdots+76=328$

因此和为 $387+396+328=1111$

## ？？？

【答案】$\text{bring her eyes}$

【解析】由于第 $12$ 题中莫名出现了一个没有必要出现的概念 **最小正剩余**，所以你应该对所有题目的答案对 $26$ 取最小正剩余，然后 $\text{A}-1, \text{B}-2, \cdots, \text{Z}-26$

| 题目编号 | $1$ | $2$ | $3$ | $4$ | $5$ | $6$ | $7$ | $8$ | $9$ | $10$ | $11$ | $12$ |
|-----|-----|-----|-----|-----|-----|-----|-----|-----|-----|-----|-----|-----|
| 题目答案 | $2$ | $122$ | $4013$ | $14$ | $85$ | $216$ | $5$ | $1006$ | $2033$ | $25$ | $57$ | $1111$ |
| 对 $26$ 取最小正剩余 | $2$ | $18$ | $9$ | $14$ | $7$ | $8$ | $5$ | $18$ | $5$ | $25$ | $5$ | $19$ |
| 对应字母 | $\text{b}$ | $\text{r}$ | $\text{i}$ | $\text{n}$ | $\text{g}$ | $\text{h}$ | $\text{e}$ | $\text{r}$ | $\text{e}$ | $\text{y}$ | $\text{e}$ | $\text{s}$ |

$\text{bring her eyes}$ 对应的书名是《带上她的眼睛》