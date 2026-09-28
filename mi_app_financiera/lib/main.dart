import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

void main() {
  runApp(const MiAppFinanciera());
}

// ─── Helpers ────────────────────────────────────────────────────────────────

final formatCOP = NumberFormat.currency(locale: 'es_CO', symbol: '\$', decimalDigits: 0);

// ─── App Root ────────────────────────────────────────────────────────────────

class MiAppFinanciera extends StatelessWidget {
  const MiAppFinanciera({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: 'Control de Gastos',
      theme: ThemeData(
        scaffoldBackgroundColor: const Color(0xFFFDFBF7),
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFFD4A5A5),
          primary: const Color(0xFFD4A5A5),
          secondary: const Color(0xFFCCD5AE),
        ),
        textTheme: const TextTheme(
          bodyMedium: TextStyle(color: Color(0xFF333333)),
        ),
        useMaterial3: true,
      ),
      home: const TableroPrincipal(),
    );
  }
}

// ─── Modelo de Transacción ───────────────────────────────────────────────────

class Transaccion {
  final String descripcion;
  final double monto;
  final String categoria;
  final DateTime fecha;
  final bool esIngreso;

  Transaccion({
    required this.descripcion,
    required this.monto,
    required this.categoria,
    required this.fecha,
    required this.esIngreso,
  });
}

// ─── Pantalla Principal ──────────────────────────────────────────────────────

class TableroPrincipal extends StatefulWidget {
  const TableroPrincipal({super.key});

  @override
  State<TableroPrincipal> createState() => _TableroPrincipalState();
}

class _TableroPrincipalState extends State<TableroPrincipal>
    with SingleTickerProviderStateMixin {
  double saldoTotal = 850000;
  int _paginaActual = 0;

  final List<Map<String, dynamic>> categorias = [
    {
      'nombre': '🏠 Hogar & Servicios',
      'gastado': 120000.0,
      'limite': 300000.0,
      'color': const Color(0xFFE8AEB7),
    },
    {
      'nombre': '☕ Gustitos & Salidas',
      'gastado': 85000.0,
      'limite': 150000.0,
      'color': const Color(0xFFB5E2FA),
    },
    {
      'nombre': '🚗 Transporte',
      'gastado': 40000.0,
      'limite': 100000.0,
      'color': const Color(0xFFEDF2F4),
    },
    {
      'nombre': '🌸 Cuidado Personal',
      'gastado': 95000.0,
      'limite': 200000.0,
      'color': const Color(0xFFF1C0E8),
    },
  ];

  final List<Transaccion> transacciones = [
    Transaccion(
      descripcion: 'Mercado semanal',
      monto: 85000,
      categoria: '🏠 Hogar & Servicios',
      fecha: DateTime.now().subtract(const Duration(days: 1)),
      esIngreso: false,
    ),
    Transaccion(
      descripcion: 'Salario quincenal',
      monto: 1200000,
      categoria: 'Ingresos',
      fecha: DateTime.now().subtract(const Duration(days: 2)),
      esIngreso: true,
    ),
    Transaccion(
      descripcion: 'Café con amiga',
      monto: 18000,
      categoria: '☕ Gustitos & Salidas',
      fecha: DateTime.now().subtract(const Duration(days: 3)),
      esIngreso: false,
    ),
    Transaccion(
      descripcion: 'TransMilenio semana',
      monto: 40000,
      categoria: '🚗 Transporte',
      fecha: DateTime.now().subtract(const Duration(days: 4)),
      esIngreso: false,
    ),
    Transaccion(
      descripcion: 'Crema facial',
      monto: 35000,
      categoria: '🌸 Cuidado Personal',
      fecha: DateTime.now().subtract(const Duration(days: 5)),
      esIngreso: false,
    ),
  ];

  // ── Añadir transacción ─────────────────────────────────────────────────────

  void _mostrarModalNuevaTransaccion() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _ModalNuevaTransaccion(
        categorias: categorias,
        onGuardar: (tx) {
          setState(() {
            transacciones.insert(0, tx);
            if (tx.esIngreso) {
              saldoTotal += tx.monto;
            } else {
              saldoTotal -= tx.monto;
              // Actualizar gastado en la categoría
              final idx = categorias.indexWhere((c) => c['nombre'] == tx.categoria);
              if (idx != -1) {
                categorias[idx]['gastado'] =
                    (categorias[idx]['gastado'] as double) + tx.monto;
              }
            }
          });
        },
      ),
    );
  }

  // ── Páginas de navegación ──────────────────────────────────────────────────

  late final List<Widget> _paginas;

  @override
  void initState() {
    super.initState();
    _paginas = [
      _PaginaResumen(
        saldoTotal: saldoTotal,
        categorias: categorias,
        transacciones: transacciones,
      ),
      _PaginaPresupuestos(categorias: categorias),
      _PaginaMovimientos(transacciones: transacciones),
    ];
  }

  @override
  Widget build(BuildContext context) {
    // Rebuild pages con datos actualizados
    final paginas = [
      _PaginaResumen(
        saldoTotal: saldoTotal,
        categorias: categorias,
        transacciones: transacciones,
      ),
      _PaginaPresupuestos(categorias: categorias),
      _PaginaMovimientos(transacciones: transacciones),
    ];

    return Scaffold(
      backgroundColor: const Color(0xFFFDFBF7),
      body: paginas[_paginaActual],
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _mostrarModalNuevaTransaccion,
        backgroundColor: const Color(0xFFD4A5A5),
        foregroundColor: Colors.white,
        icon: const Icon(Icons.add_rounded),
        label: const Text('Registrar', style: TextStyle(fontWeight: FontWeight.w600)),
        elevation: 4,
      ),
      floatingActionButtonLocation: FloatingActionButtonLocation.centerDocked,
      bottomNavigationBar: _BarraNavegacion(
        paginaActual: _paginaActual,
        onTap: (i) => setState(() => _paginaActual = i),
      ),
    );
  }
}

// ─── Barra de Navegación ─────────────────────────────────────────────────────

class _BarraNavegacion extends StatelessWidget {
  final int paginaActual;
  final ValueChanged<int> onTap;

  const _BarraNavegacion({required this.paginaActual, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return BottomAppBar(
      color: Colors.white,
      elevation: 8,
      shape: const CircularNotchedRectangle(),
      notchMargin: 8,
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceAround,
        children: [
          _ItemNav(icono: Icons.home_rounded, label: 'Inicio', idx: 0, actual: paginaActual, onTap: onTap),
          _ItemNav(icono: Icons.pie_chart_rounded, label: 'Presupuestos', idx: 1, actual: paginaActual, onTap: onTap),
          const SizedBox(width: 56),
          _ItemNav(icono: Icons.receipt_long_rounded, label: 'Movimientos', idx: 2, actual: paginaActual, onTap: onTap),
          // espacio extra para simetría
          const SizedBox(width: 40),
        ],
      ),
    );
  }
}

class _ItemNav extends StatelessWidget {
  final IconData icono;
  final String label;
  final int idx;
  final int actual;
  final ValueChanged<int> onTap;

  const _ItemNav({
    required this.icono,
    required this.label,
    required this.idx,
    required this.actual,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final activo = idx == actual;
    return GestureDetector(
      onTap: () => onTap(idx),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(
          color: activo ? const Color(0xFFD4A5A5).withOpacity(0.15) : Colors.transparent,
          borderRadius: BorderRadius.circular(12),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icono,
                color: activo ? const Color(0xFFD4A5A5) : const Color(0xFFAAAAAA),
                size: 22),
            const SizedBox(height: 2),
            Text(label,
                style: TextStyle(
                  fontSize: 10,
                  color: activo ? const Color(0xFFD4A5A5) : const Color(0xFFAAAAAA),
                  fontWeight: activo ? FontWeight.w700 : FontWeight.normal,
                )),
          ],
        ),
      ),
    );
  }
}

// ─── Página Resumen ───────────────────────────────────────────────────────────

class _PaginaResumen extends StatelessWidget {
  final double saldoTotal;
  final List<Map<String, dynamic>> categorias;
  final List<Transaccion> transacciones;

  const _PaginaResumen({
    required this.saldoTotal,
    required this.categorias,
    required this.transacciones,
  });

  double get _totalGastado =>
      categorias.fold(0, (sum, c) => sum + (c['gastado'] as double));

  double get _totalIngresos => transacciones
      .where((t) => t.esIngreso)
      .fold(0, (sum, t) => sum + t.monto);

  @override
  Widget build(BuildContext context) {
    final recientes = transacciones.take(3).toList();

    return CustomScrollView(
      slivers: [
        // ── Header ──────────────────────────────────────────────────────────
        SliverToBoxAdapter(
          child: Container(
            decoration: const BoxDecoration(
              gradient: LinearGradient(
                colors: [Color(0xFFD4A5A5), Color(0xFFE8B4B8)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.vertical(bottom: Radius.circular(32)),
            ),
            padding: const EdgeInsets.fromLTRB(24, 60, 24, 32),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Hola, Deccy 👋',
                            style: TextStyle(
                              color: Colors.white.withOpacity(0.9),
                              fontSize: 14,
                            )),
                        const Text('Mi Bolsa',
                            style: TextStyle(
                              color: Colors.white,
                              fontSize: 22,
                              fontWeight: FontWeight.bold,
                            )),
                      ],
                    ),
                    CircleAvatar(
                      backgroundColor: Colors.white.withOpacity(0.25),
                      child: const Icon(Icons.notifications_none_rounded,
                          color: Colors.white),
                    ),
                  ],
                ),
                const SizedBox(height: 24),
                Text(formatCOP.format(saldoTotal),
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 38,
                      fontWeight: FontWeight.w800,
                      letterSpacing: -1,
                    )),
                const SizedBox(height: 4),
                Text('Saldo disponible',
                    style: TextStyle(
                        color: Colors.white.withOpacity(0.8), fontSize: 13)),
                const SizedBox(height: 20),
                Row(
                  children: [
                    _MiniStat(
                        icono: Icons.arrow_downward_rounded,
                        label: 'Gastos',
                        valor: _totalGastado,
                        color: const Color(0xFFFF8FA3)),
                    const SizedBox(width: 12),
                    _MiniStat(
                        icono: Icons.arrow_upward_rounded,
                        label: 'Ingresos',
                        valor: _totalIngresos,
                        color: const Color(0xFFCCD5AE)),
                  ],
                ),
              ],
            ),
          ),
        ),

        // ── Categorías ───────────────────────────────────────────────────────
        SliverToBoxAdapter(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(24, 28, 24, 0),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: const [
                Text('Presupuestos',
                    style:
                        TextStyle(fontSize: 17, fontWeight: FontWeight.w700)),
                Text('Ver todo',
                    style: TextStyle(
                        fontSize: 13, color: Color(0xFFD4A5A5))),
              ],
            ),
          ),
        ),

        SliverToBoxAdapter(
          child: SizedBox(
            height: 150,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.fromLTRB(24, 14, 24, 0),
              itemCount: categorias.length,
              separatorBuilder: (_, __) => const SizedBox(width: 12),
              itemBuilder: (_, i) => _TarjetaCategoria(cat: categorias[i]),
            ),
          ),
        ),

        // ── Recientes ────────────────────────────────────────────────────────
        SliverToBoxAdapter(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(24, 28, 24, 12),
            child: const Text('Últimos movimientos',
                style: TextStyle(fontSize: 17, fontWeight: FontWeight.w700)),
          ),
        ),

        SliverList(
          delegate: SliverChildBuilderDelegate(
            (_, i) => Padding(
              padding: const EdgeInsets.fromLTRB(24, 0, 24, 8),
              child: _FilaTransaccion(tx: recientes[i]),
            ),
            childCount: recientes.length,
          ),
        ),

        const SliverToBoxAdapter(child: SizedBox(height: 100)),
      ],
    );
  }
}

class _MiniStat extends StatelessWidget {
  final IconData icono;
  final String label;
  final double valor;
  final Color color;

  const _MiniStat(
      {required this.icono,
      required this.label,
      required this.valor,
      required this.color});

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        decoration: BoxDecoration(
          color: Colors.white.withOpacity(0.2),
          borderRadius: BorderRadius.circular(14),
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(6),
              decoration: BoxDecoration(
                color: color.withOpacity(0.3),
                shape: BoxShape.circle,
              ),
              child: Icon(icono, color: Colors.white, size: 14),
            ),
            const SizedBox(width: 8),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(label,
                    style: TextStyle(
                        color: Colors.white.withOpacity(0.8), fontSize: 11)),
                Text(formatCOP.format(valor),
                    style: const TextStyle(
                        color: Colors.white,
                        fontSize: 13,
                        fontWeight: FontWeight.w700)),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _TarjetaCategoria extends StatelessWidget {
  final Map<String, dynamic> cat;
  const _TarjetaCategoria({required this.cat});

  @override
  Widget build(BuildContext context) {
    final pct = (cat['gastado'] as double) / (cat['limite'] as double);
    final excedido = pct >= 1.0;

    return Container(
      width: 160,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: (cat['color'] as Color).withOpacity(0.35),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
            color: (cat['color'] as Color).withOpacity(0.6), width: 1.2),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(cat['nombre'],
              style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
              maxLines: 2),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              ClipRRect(
                borderRadius: BorderRadius.circular(6),
                child: LinearProgressIndicator(
                  value: pct.clamp(0.0, 1.0),
                  minHeight: 6,
                  backgroundColor: Colors.white.withOpacity(0.5),
                  color: excedido ? const Color(0xFFE07A7A) : const Color(0xFFD4A5A5),
                ),
              ),
              const SizedBox(height: 6),
              Text(
                '${formatCOP.format(cat['gastado'])} / ${formatCOP.format(cat['limite'])}',
                style: TextStyle(
                  fontSize: 11,
                  color: excedido ? const Color(0xFFE07A7A) : const Color(0xFF555555),
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

// ─── Página Presupuestos ──────────────────────────────────────────────────────

class _PaginaPresupuestos extends StatelessWidget {
  final List<Map<String, dynamic>> categorias;
  const _PaginaPresupuestos({required this.categorias});

  @override
  Widget build(BuildContext context) {
    return CustomScrollView(
      slivers: [
        SliverAppBar(
          pinned: true,
          backgroundColor: const Color(0xFFFDFBF7),
          elevation: 0,
          title: const Text('Presupuestos',
              style: TextStyle(fontWeight: FontWeight.w800, color: Color(0xFF333333))),
          centerTitle: false,
        ),
        SliverList(
          delegate: SliverChildBuilderDelegate(
            (_, i) {
              final cat = categorias[i];
              final pct = (cat['gastado'] as double) / (cat['limite'] as double);
              final restante = (cat['limite'] as double) - (cat['gastado'] as double);
              final excedido = restante < 0;

              return Padding(
                padding: const EdgeInsets.fromLTRB(20, 0, 20, 14),
                child: Container(
                  padding: const EdgeInsets.all(18),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(20),
                    boxShadow: [
                      BoxShadow(
                          color: Colors.black.withOpacity(0.05),
                          blurRadius: 12,
                          offset: const Offset(0, 4)),
                    ],
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(cat['nombre'],
                              style: const TextStyle(
                                  fontWeight: FontWeight.w700, fontSize: 14)),
                          Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 10, vertical: 4),
                            decoration: BoxDecoration(
                              color: excedido
                                  ? const Color(0xFFFFE5E5)
                                  : const Color(0xFFE8F5E9),
                              borderRadius: BorderRadius.circular(20),
                            ),
                            child: Text(
                              excedido
                                  ? 'Excedido'
                                  : '${(pct * 100).toStringAsFixed(0)}% usado',
                              style: TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.w700,
                                color: excedido
                                    ? const Color(0xFFE07A7A)
                                    : const Color(0xFF66BB6A),
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 14),
                      ClipRRect(
                        borderRadius: BorderRadius.circular(8),
                        child: LinearProgressIndicator(
                          value: pct.clamp(0.0, 1.0),
                          minHeight: 10,
                          backgroundColor: const Color(0xFFF0EDE8),
                          color: excedido
                              ? const Color(0xFFE07A7A)
                              : cat['color'] as Color,
                        ),
                      ),
                      const SizedBox(height: 12),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          _InfoPct(
                              label: 'Gastado',
                              valor: formatCOP.format(cat['gastado'])),
                          _InfoPct(
                              label: 'Límite',
                              valor: formatCOP.format(cat['limite'])),
                          _InfoPct(
                              label: excedido ? 'Exceso' : 'Disponible',
                              valor: formatCOP.format(restante.abs()),
                              color: excedido
                                  ? const Color(0xFFE07A7A)
                                  : const Color(0xFF66BB6A)),
                        ],
                      ),
                    ],
                  ),
                ),
              );
            },
            childCount: categorias.length,
          ),
        ),
        const SliverToBoxAdapter(child: SizedBox(height: 100)),
      ],
    );
  }
}

class _InfoPct extends StatelessWidget {
  final String label;
  final String valor;
  final Color? color;

  const _InfoPct({required this.label, required this.valor, this.color});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label,
            style: const TextStyle(fontSize: 11, color: Color(0xFF999999))),
        Text(valor,
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w700,
              color: color ?? const Color(0xFF333333),
            )),
      ],
    );
  }
}

// ─── Página Movimientos ───────────────────────────────────────────────────────

class _PaginaMovimientos extends StatelessWidget {
  final List<Transaccion> transacciones;
  const _PaginaMovimientos({required this.transacciones});

  @override
  Widget build(BuildContext context) {
    return CustomScrollView(
      slivers: [
        SliverAppBar(
          pinned: true,
          backgroundColor: const Color(0xFFFDFBF7),
          elevation: 0,
          title: const Text('Movimientos',
              style: TextStyle(fontWeight: FontWeight.w800, color: Color(0xFF333333))),
          centerTitle: false,
        ),
        SliverList(
          delegate: SliverChildBuilderDelegate(
            (_, i) => Padding(
              padding: const EdgeInsets.fromLTRB(20, 0, 20, 10),
              child: _FilaTransaccion(tx: transacciones[i]),
            ),
            childCount: transacciones.length,
          ),
        ),
        const SliverToBoxAdapter(child: SizedBox(height: 100)),
      ],
    );
  }
}

class _FilaTransaccion extends StatelessWidget {
  final Transaccion tx;
  const _FilaTransaccion({required this.tx});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
              color: Colors.black.withOpacity(0.04),
              blurRadius: 8,
              offset: const Offset(0, 3)),
        ],
      ),
      child: Row(
        children: [
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              color: tx.esIngreso
                  ? const Color(0xFFCCD5AE).withOpacity(0.3)
                  : const Color(0xFFD4A5A5).withOpacity(0.2),
              shape: BoxShape.circle,
            ),
            child: Icon(
              tx.esIngreso
                  ? Icons.arrow_upward_rounded
                  : Icons.arrow_downward_rounded,
              color: tx.esIngreso
                  ? const Color(0xFF6A8F52)
                  : const Color(0xFFD4A5A5),
              size: 20,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(tx.descripcion,
                    style: const TextStyle(
                        fontWeight: FontWeight.w600, fontSize: 14)),
                Text(tx.categoria,
                    style: const TextStyle(
                        fontSize: 12, color: Color(0xFF999999))),
              ],
            ),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                '${tx.esIngreso ? '+' : '-'}${formatCOP.format(tx.monto)}',
                style: TextStyle(
                  fontWeight: FontWeight.w700,
                  fontSize: 14,
                  color: tx.esIngreso
                      ? const Color(0xFF6A8F52)
                      : const Color(0xFFE07A7A),
                ),
              ),
              Text(
                DateFormat('dd/MM').format(tx.fecha),
                style:
                    const TextStyle(fontSize: 11, color: Color(0xFFBBBBBB)),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

// ─── Modal Nueva Transacción ──────────────────────────────────────────────────

class _ModalNuevaTransaccion extends StatefulWidget {
  final List<Map<String, dynamic>> categorias;
  final ValueChanged<Transaccion> onGuardar;

  const _ModalNuevaTransaccion(
      {required this.categorias, required this.onGuardar});

  @override
  State<_ModalNuevaTransaccion> createState() => _ModalNuevaTransaccionState();
}

class _ModalNuevaTransaccionState extends State<_ModalNuevaTransaccion> {
  final _descCtrl = TextEditingController();
  final _montoCtrl = TextEditingController();
  bool _esIngreso = false;
  String? _categoriaSeleccionada;

  @override
  Widget build(BuildContext context) {
    final cats = _esIngreso
        ? ['Ingresos', 'Transferencia', 'Otro']
        : widget.categorias.map((c) => c['nombre'] as String).toList();

    return Container(
      padding: EdgeInsets.only(
          bottom: MediaQuery.of(context).viewInsets.bottom + 24,
          top: 24,
          left: 24,
          right: 24),
      decoration: const BoxDecoration(
        color: Color(0xFFFDFBF7),
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Indicador
          Center(
            child: Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                  color: const Color(0xFFDDDDDD),
                  borderRadius: BorderRadius.circular(2)),
            ),
          ),
          const SizedBox(height: 20),
          const Text('Nuevo movimiento',
              style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800)),
          const SizedBox(height: 20),

          // Toggle Gasto / Ingreso
          Container(
            decoration: BoxDecoration(
              color: const Color(0xFFF0EDE8),
              borderRadius: BorderRadius.circular(14),
            ),
            padding: const EdgeInsets.all(4),
            child: Row(
              children: [
                _ToggleOpcion(
                    label: 'Gasto',
                    activo: !_esIngreso,
                    color: const Color(0xFFD4A5A5),
                    onTap: () => setState(() {
                          _esIngreso = false;
                          _categoriaSeleccionada = null;
                        })),
                _ToggleOpcion(
                    label: 'Ingreso',
                    activo: _esIngreso,
                    color: const Color(0xFF6A8F52),
                    onTap: () => setState(() {
                          _esIngreso = true;
                          _categoriaSeleccionada = null;
                        })),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // Descripción
          _Campo(
            controller: _descCtrl,
            label: 'Descripción',
            hint: 'Ej: Mercado, Gasolina...',
            icono: Icons.edit_note_rounded,
          ),
          const SizedBox(height: 12),

          // Monto
          _Campo(
            controller: _montoCtrl,
            label: 'Monto (COP)',
            hint: '0',
            icono: Icons.attach_money_rounded,
            teclado: TextInputType.number,
          ),
          const SizedBox(height: 12),

          // Categoría
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: const Color(0xFFE8E0DC)),
            ),
            child: DropdownButtonHideUnderline(
              child: DropdownButton<String>(
                value: _categoriaSeleccionada,
                hint: const Text('Seleccionar categoría',
                    style: TextStyle(color: Color(0xFFAAAAAA), fontSize: 14)),
                isExpanded: true,
                icon: const Icon(Icons.keyboard_arrow_down_rounded,
                    color: Color(0xFFD4A5A5)),
                items: cats
                    .map((c) => DropdownMenuItem(value: c, child: Text(c)))
                    .toList(),
                onChanged: (v) => setState(() => _categoriaSeleccionada = v),
              ),
            ),
          ),
          const SizedBox(height: 24),

          // Botón guardar
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: _guardar,
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFFD4A5A5),
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(16)),
                elevation: 0,
              ),
              child: const Text('Guardar movimiento',
                  style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
            ),
          ),
        ],
      ),
    );
  }

  void _guardar() {
    final desc = _descCtrl.text.trim();
    final monto = double.tryParse(_montoCtrl.text.replaceAll('.', '').replaceAll(',', ''));

    if (desc.isEmpty || monto == null || monto <= 0 || _categoriaSeleccionada == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Completa todos los campos'), backgroundColor: Color(0xFFE07A7A)),
      );
      return;
    }

    widget.onGuardar(Transaccion(
      descripcion: desc,
      monto: monto,
      categoria: _categoriaSeleccionada!,
      fecha: DateTime.now(),
      esIngreso: _esIngreso,
    ));
    Navigator.pop(context);
  }
}

class _ToggleOpcion extends StatelessWidget {
  final String label;
  final bool activo;
  final Color color;
  final VoidCallback onTap;

  const _ToggleOpcion(
      {required this.label,
      required this.activo,
      required this.color,
      required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: GestureDetector(
        onTap: onTap,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          padding: const EdgeInsets.symmetric(vertical: 10),
          decoration: BoxDecoration(
            color: activo ? color : Colors.transparent,
            borderRadius: BorderRadius.circular(10),
          ),
          child: Text(label,
              textAlign: TextAlign.center,
              style: TextStyle(
                fontWeight: FontWeight.w700,
                fontSize: 14,
                color: activo ? Colors.white : const Color(0xFF888888),
              )),
        ),
      ),
    );
  }
}

class _Campo extends StatelessWidget {
  final TextEditingController controller;
  final String label;
  final String hint;
  final IconData icono;
  final TextInputType teclado;

  const _Campo({
    required this.controller,
    required this.label,
    required this.hint,
    required this.icono,
    this.teclado = TextInputType.text,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFFE8E0DC)),
      ),
      child: TextField(
        controller: controller,
        keyboardType: teclado,
        decoration: InputDecoration(
          labelText: label,
          hintText: hint,
          prefixIcon: Icon(icono, color: const Color(0xFFD4A5A5), size: 20),
          border: InputBorder.none,
          contentPadding:
              const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
          labelStyle:
              const TextStyle(fontSize: 13, color: Color(0xFF999999)),
        ),
      ),
    );
  }
}
