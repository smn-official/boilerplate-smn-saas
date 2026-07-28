using Microsoft.AspNetCore.Mvc;

namespace Mobi.Site.Web.Features.Home;

/// <summary>
/// Landing pública de venda do Fiat Mobi. Conteúdo mockado na view — sem backend.
/// </summary>
public sealed class HomeController : Controller
{
    /// <summary>
    /// Página inicial da campanha.
    /// </summary>
    public IActionResult Index()
    {
        return View();
    }

    /// <summary>
    /// Página de erro genérica.
    /// </summary>
    [Route("/erro")]
    public IActionResult Erro()
    {
        return View();
    }
}
